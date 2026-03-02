import { v4 as uuidv4 } from 'uuid';
import { createPaymentApi, getPaymentApi } from '../api/apiYoo';
import PaymentSchema from '../models/payment-model';
import SubscriptionSchema from '../models/subscription-model';
import PromoSchema from '../models/promo-model';
import { addClient } from './xray-service';
import { bot } from '../index'
import { checkAllServers, ensureUserTokens, normalizeWebhook, sendSubMessage, simulateAsyncOperation } from './other-service';
import UserSchema from '../models/user-model';
import ServerSchema from '../models/server-model';
import * as settings from "../settings"


export const createPayment = async (userId: number, price: number) => {
  try {
    const idempotenceKeyClient = uuidv4()
    const payment = await createPaymentApi(price, idempotenceKeyClient)

    if (!payment) return { error: { message: 'Session not found' } }

    const pay = new PaymentSchema({
      price,
      userId,
      paymentId: payment.id,
      idempotenceKeyClient,
      status: payment.status,
      confirmationUrl: payment.confirmation.confirmation_url
    })
    await pay.save()

    return { paymentId: payment.id, url: payment.confirmation.confirmation_url }
  } catch (error) {
    console.error('createPayment error:', error)
    return { error: { message: 'createPayment failed' } }
  }
}

export const checkPayment = async (paymentIdClient: string, userId: number, price: string) => {
  try {
    const response = await getPaymentApi(paymentIdClient);
    if (!response) return { error: { message: 'Session not found' } };

    switch (response.status) {
      case 'succeeded': {
        const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient });
        if (payment) {
          payment.status = 'succeeded';
          payment.processed = true;
          await payment.save();
        } else {
          console.log('Платеж не найден');
          break;
        }
        await paySucceeded(userId, price);
        break;
      }
      case 'canceled': {
        const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient });
        if (payment) {
          payment.status = 'canceled';
          await payment.save();
        } else {
          console.log('Платеж не найден');
        }
        break;
      }
      case 'pending': {
        break;
      }
      default:
        throw new Error(`Неизвестный статус платежа: ${response.status}`);
    }
  } catch (error) {
    console.error('checkPayment error:', error);
  }
};


export const handlePaymentWebhook = async (payload: any) => {
  try {
    const normalized = normalizeWebhook(payload);
    if (!normalized) {
      console.log('Ошибка валидации');
      return { error: { message: 'invalid payload' } };
    }

    const { paymentId, status } = normalized;
    const payment = await PaymentSchema.findOne({ paymentId });
    if (!payment) {
      return { error: { message: 'payment not found' } };
    }

    if (payment.processed) return { ok: true };

    if (status === 'canceled') {
      payment.status = 'canceled';
      payment.processed = true;
      await payment.save();
      return { ok: true };
    }

    if (status === 'succeeded') {
      await paySucceeded(Number(payment.userId), String(payment.price));
      payment.status = 'succeeded';
      payment.processed = true;
      await payment.save();
      return { ok: true };
    }

    return { ok: true };
  } catch (error) {
    console.error('handlePaymentWebhook error:', error);
    return { error: { message: 'handlePaymentWebhook failed' } };
  }
}

export const paySucceeded = async (userId: number, price: string) => {
  try {
    const prices: { [key: string]: number } = {
      [String(settings.PRICE_30_DAYS)]: 30,
      [String(settings.PRICE_90_DAYS)]: 90,
    }
    const days = prices[price]
    const user = await ensureUserTokens(userId)
    if (!user) return null

    // --- Реферальная логика ---
    if (typeof user.inviteId == 'number' && user.userId !== user.inviteId) {
      const inviteSub = await SubscriptionSchema.findOne({ userId: user.inviteId, statusSub: true })

      if (inviteSub) {
        const expirationDate = new Date(new Date(`${inviteSub.subExpire}`).getTime() + settings.DAY_FOR_INVITE * 24 * 60 * 60 * 1000)
        inviteSub.subExpire = expirationDate
        inviteSub.warningDay = []
        user.inviteId = `${user.inviteId}`
        await Promise.all([user.save(), inviteSub.save()])

        await bot.api.sendMessage(parseInt(user.inviteId as string), `Ваша подписка продлена на <b>${settings.DAY_FOR_INVITE}</b> дней после оплаты <b>${user.first_name}!</b>`, {
          parse_mode: 'HTML'
        })
      }
    }

    // --- Продление / апгрейд существующей подписки ---
    const activeSub = await SubscriptionSchema.findOne({ userId, statusSub: true })
    if (activeSub) {
      const expirationDate = new Date(new Date(`${activeSub.subExpire}`).getTime() + days * 24 * 60 * 60 * 1000)
      activeSub.subExpire = expirationDate
      activeSub.warningDay = []
      if (activeSub.type === 'free') activeSub.type = 'paid'
      await activeSub.save()

      await bot.api.sendMessage(userId, `Ваша подписка продлена на <b>${days}</b> дней!`, { parse_mode: 'HTML' })
      await bot.api.sendMessage(userId, `Спасибо что выбрали <b>VPNinja</b> ❤️`, { parse_mode: 'HTML' })
      return
    }

    // --- Новая подписка: добавляем на все серверы ---
    const servers = await checkAllServers()
    if (!servers.length) return null

    const serverEntries: { serverId: any; config: string }[] = []
    for (const server of servers) {
      const result = await addClient(userId, user.uuid!, server)
      if (result) {
        serverEntries.push({ serverId: server._id, config: result.config })
        await ServerSchema.findByIdAndUpdate(server._id, { $inc: { quantityUsers: 1 } })
      }
    }

    if (!serverEntries.length) return null

    const subscription = new SubscriptionSchema({
      userId,
      type: 'paid',
      statusSub: true,
      subExpire: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      servers: serverEntries,
    })

    if (!user.useFreeSub) {
      user.useFreeSub = true
      await user.save()
    }
    await subscription.save()

    await sendSubMessage(userId, user.subToken!)
  } catch (error) {
    console.error('paySucceeded error:', error)
    return null
  }
}


export const activatePromo = async (userId: number, code: string) => {
  try {
    const promo = await PromoSchema.findOne({ code, isUsed: false })
    if (!promo) return { error: 'Промокод не найден или уже использован' }

    const user = await ensureUserTokens(userId)
    if (!user) return { error: 'Пользователь не найден' }

    promo.isUsed = true
    promo.usedBy = userId
    promo.usedAt = new Date()
    await promo.save()

    const friendExpire = new Date()
    friendExpire.setFullYear(friendExpire.getFullYear() + 100)

    const activeSub = await SubscriptionSchema.findOne({ userId, statusSub: true })
    if (activeSub) {
      activeSub.subExpire = friendExpire
      activeSub.type = 'friend'
      activeSub.warningDay = []
      await activeSub.save()
      await sendSubMessage(userId, user.subToken!)
      return { ok: true }
    }

    const servers = await checkAllServers()
    if (!servers.length) return { error: 'Нет доступных серверов' }

    const serverEntries: { serverId: any; config: string }[] = []
    for (const server of servers) {
      const result = await addClient(userId, user.uuid!, server)
      if (result) {
        serverEntries.push({ serverId: server._id, config: result.config })
        await ServerSchema.findByIdAndUpdate(server._id, { $inc: { quantityUsers: 1 } })
      }
    }
    if (!serverEntries.length) return { error: 'Не удалось добавить на серверы' }

    const subscription = new SubscriptionSchema({
      userId, type: 'friend', statusSub: true,
      subExpire: friendExpire,
      servers: serverEntries,
    })
    await subscription.save()

    await sendSubMessage(userId, user.subToken!)
    return { ok: true }
  } catch (error) {
    console.error('activatePromo error:', error)
    return { error: 'Внутренняя ошибка' }
  }
}


export const generatePromoCodes = async (userId: number, count: number) => {
  try {
    if (!settings.ADMIN_USER_ID || userId !== settings.ADMIN_USER_ID) {
      return { error: 'Доступ запрещён' }
    }

    const safeCount = Math.min(Math.max(1, count), 10)
    const codes: string[] = []

    for (let i = 0; i < safeCount; i++) {
      const code = 'FRIEND-' + uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase()
      await PromoSchema.create({ code, isUsed: false })
      codes.push(code)
    }

    return { codes }
  } catch (error) {
    console.error('generatePromoCodes error:', error)
    return { error: 'Внутренняя ошибка' }
  }
}

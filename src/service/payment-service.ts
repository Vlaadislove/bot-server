import { v4 as uuidv4 } from 'uuid';
import { createPaymentApi, getPaymentApi } from '../api/apiYoo';
import PaymentSchema from '../models/payment-model';
import SubscriptionSchema from '../models/subscription-model';
import { addClient } from './xray-service';
import { bot } from '../index'
import { InlineKeyboard } from 'grammy';
import { checkServer, simulateAsyncOperation } from './other-service';
import SubscriptionFreeSchema from '../models/free-subscription-model';
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
  let response;
  let stopLoop = false;

  while (!stopLoop) {
    try {
      response = await getPaymentApi(paymentIdClient);
      if (!response) return { error: { message: 'Session not found' } }

      switch (response.status) {
        case "succeeded": {
          const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient })
          if (payment) {
            payment.status = "succeeded"
            await payment.save()
          } else {
            console.log('Платеж не найдет')
            stopLoop = true
            break
          }
          paySucceeded(userId, price)
          stopLoop = true
          break
        }
        case "canceled": {

          const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient })
          if (payment) {
            payment.status = "canceled"
            await payment.save()
          } else {
            console.log('Платеж не найден')
            stopLoop = true
            break
          }
          console.log(Date())
          stopLoop = true
          break
        }
        case "pending": {
          await simulateAsyncOperation(1000)
          break
        }
        default:
          throw new Error(`Неизвестный статус платежа: ${response.status}`);
      }
    } catch (error) {
      console.error('checkPayment error:', error);
      stopLoop = true; // не зацикливаемся при ошибках
    }
  }
}

export const paySucceeded = async (userId: number, price: string) => {
  try {
    const prices: { [key: string]: number } = {
      '170': 30,
      '480': 90
    }
    const days = prices[price]
    const user = await UserSchema.findOne({ userId })

    //Добавление дополнительных дней для user который пригласил нового пользователя
    if (typeof user?.inviteId == 'number' && user.userId !== user.inviteId) {
      const inviteSubFree = await SubscriptionFreeSchema.findOne({ userId: user.inviteId, statusSub: true })
      const inviteSub = await SubscriptionSchema.findOne({ userId: user.inviteId, statusSub: true })

      if (inviteSubFree) {
        const { userId, config, uuid, statusSub, subExpire, server } = inviteSubFree

        const expirationDate = new Date(new Date(`${subExpire}`).getTime() + settings.DAY_FOR_INVITE * 24 * 60 * 60 * 1000);

        const subscription = new SubscriptionSchema({
          userId,
          config,
          server,
          uuid,
          statusSub,
          subExpire: expirationDate,
        })
        inviteSubFree.statusSub = false
        user.inviteId = `${user.inviteId}`
        await Promise.all([
          user.save(),
          subscription.save(),
          inviteSubFree.save()
        ])
        await bot.api.sendMessage(parseInt(user.inviteId), `Ваша подписка продлена на <b>${settings.DAY_FOR_INVITE}</b> дней после оплаты <b>${user.first_name}!</b>`, {
          parse_mode: 'HTML'
        })
      } else if (inviteSub) {
        const expirationDate = new Date(new Date(`${inviteSub.subExpire}`).getTime() + settings.DAY_FOR_INVITE * 24 * 60 * 60 * 1000);
        inviteSub.subExpire = expirationDate
        inviteSub.warningDay = []
        user.inviteId = `${user.inviteId}`
        await Promise.all([
          user.save(),
          inviteSub.save()
        ])

        await bot.api.sendMessage(parseInt(user.inviteId), `Ваша подписка продлена на <b>${settings.DAY_FOR_INVITE}</b> дней после оплаты <b>${user.first_name}!</b>`, {
          parse_mode: 'HTML'
        })
      }
    }

    const subscriptionFreeCheck = await SubscriptionFreeSchema.findOne({ userId, statusSub: true })
    const subscriptionCheck = await SubscriptionSchema.findOne({ userId, statusSub: true })

    if (subscriptionFreeCheck) {

      const { userId, config, uuid, statusSub, subExpire, server } = subscriptionFreeCheck

      const expirationDate = new Date(new Date(`${subExpire}`).getTime() + days * 24 * 60 * 60 * 1000);

      const subscription = new SubscriptionSchema({
        userId,
        config,
        server,
        uuid,
        statusSub,
        subExpire: expirationDate,
      })
      subscriptionFreeCheck.statusSub = false

      await Promise.all([
        subscription.save(),
        subscriptionFreeCheck.save()
      ])

      await bot.api.sendMessage(userId, `Ваша подписка продлена на <b>${days}</b> дней!`, {
        parse_mode: 'HTML'
      })
      await bot.api.sendMessage(userId, `Спасибо что выбрали <b>VPNinja</b> ❤️`, {
        parse_mode: 'HTML'
      })
      return

    } else if (subscriptionCheck) {
      const expirationDate = new Date(new Date(`${subscriptionCheck.subExpire}`).getTime() + days * 24 * 60 * 60 * 1000);

      subscriptionCheck.subExpire = expirationDate
      subscriptionCheck.warningDay = []
      await subscriptionCheck.save()
      await bot.api.sendMessage(userId, `Ваша подписка продлена на <b>${days}</b> дней!`, {
        parse_mode: 'HTML'
      })
      await bot.api.sendMessage(userId, `Спасибо что выбрали <b>VPNinja</b> ❤️`, {
        parse_mode: 'HTML'
      })
      return
    }

    const server = await checkServer(userId)

    if (!server?.cookie) return null
    //TODO Добавить логику что если у человека была подписка, то делать тот же uuid как и в прошлой подписке что бы после оплаты он мог дальше пользоваться спокойно
    const data = await addClient(userId, server)
    if (!data) return null

    const { config, uuid } = data

    const subscription = new SubscriptionSchema({
      userId,
      config: config,
      uuid,
      server,
      statusSub: true,
      subExpire: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    })

    if (user && !user?.useFreeSub) {
      user.useFreeSub = true
      user.save()
    }
    await ServerSchema.findByIdAndUpdate(server.id, {
      $inc: { quantityUsers: 1 },
    }) // -1
    await subscription.save()
    const oneMonthInlineBoard = new InlineKeyboard().text('🗂 Инструкция', `instructions`)
    await bot.api.sendMessage(userId, '❗️<i>Обрати внимание, что этот конфиг предназначен только для одного устройства.</i>❗️', {
      parse_mode: 'HTML'
    })
    await bot.api.sendMessage(userId, `<code>${config}</code>`, {
      parse_mode: 'HTML'
    })
    await bot.api.sendMessage(userId, 'Это ваш конфиг ⬆ для VPN, скопируйте его(через долгое нажатие или просто нажмите на сообщение) и нажмите на кнопку 🗂<b>Инструкция</b>, выберите ваше устройство и подключайтесь к нам!', {
      reply_markup: oneMonthInlineBoard,
      parse_mode: 'HTML'

    })
  } catch (error) {
    console.error('paySucceeded error:', error)
    return null
  }
}




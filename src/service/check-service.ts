import cron from 'node-cron';
import SubscriptionSchema, { ISubscription } from "../models/subscription-model"
import { bot } from '../index'
import { deleteClient, login } from "./xray-service"
import PaymentSchema from "../models/payment-model"
import { checkPayment } from "./payment-service"
import { simulateAsyncOperation } from "./other-service"
import { InlineKeyboard } from 'grammy';
import UserSchema from '../models/user-model';


export const checkWarningDay = async () => {
  const connectInlineBoard = new InlineKeyboard()
    .text('💳 Продлить подписку', 'connect')
  try {
    const dayOne = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    const dayThree = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const warningThreeDay = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: dayThree }, warningDay: { $nin: 3 } })
    const warningOneDay = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: dayOne }, warningDay: { $nin: 1 } })

    const updateWarningDay = async (subscription: ISubscription, warningDay: number) => {
      await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $push: { warningDay } });
      try {
        if (warningDay === 3) {
          await bot.api.sendMessage(subscription.userId, `❗️Осталось ${warningDay} дня до окончания подписки!❗️`, {
            reply_markup: connectInlineBoard
          })
        }
        if (warningDay === 1) {
          await bot.api.sendMessage(subscription.userId, `❗️Остался ${warningDay} день до окончания подписки!❗️`, {
            reply_markup: connectInlineBoard
          })
        }
      } catch (error) {
        if (error instanceof Error && 'error_code' in error && 'description' in error) {
          const e = error as { error_code: number, description: string };
          if (e.error_code === 403 && (e.description.includes('bot was blocked by the user') || e.description.includes('user is deactivated'))) {
            await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $push: { warningDay } });
          } else {
            console.error('An unexpected error occurred:', e);
          }
        } else {
          console.error('An unexpected error occurred:', error);
        }
      }
    };

    for (const subscription of warningThreeDay) {
      await updateWarningDay(subscription, 3);
      await simulateAsyncOperation(1500);
    }
    for (const subscription of warningOneDay) {
      await updateWarningDay(subscription, 1);
      await simulateAsyncOperation(1500);
    }

  } catch (error) {
    console.log(error)
  }
}

export const checkStatusSubscribes = async () => {
  const connectInlineBoard = new InlineKeyboard()
    .text('💳 Продлить подписку', 'connect')
  try {
    const currentDay = new Date()
    const expired = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: currentDay } })

    const handleExpired = async (subscription: ISubscription) => {
      try {
        await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $set: { statusSub: false } });

        const user = await UserSchema.findOne({ userId: subscription.userId })
        if (user?.uuid) {
          for (const entry of subscription.servers) {
            await deleteClient(user.uuid, subscription.userId, entry.serverId)
          }
        }

        const msgText = subscription.type === 'free'
          ? `Бесплатная подписка кончилась!😢`
          : `Подписка кончилась!😢`

        await bot.api.sendMessage(subscription.userId, msgText, {
          reply_markup: connectInlineBoard
        })
      } catch (error) {
        if (error instanceof Error && 'error_code' in error && 'description' in error) {
          const e = error as { error_code: number, description: string };
          if (e.error_code === 403 && (e.description.includes('bot was blocked by the user') || e.description.includes('user is deactivated'))) {
            await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $set: { statusSub: false } });
            const user = await UserSchema.findOne({ userId: subscription.userId })
            if (user?.uuid) {
              for (const entry of subscription.servers) {
                await deleteClient(user.uuid, subscription.userId, entry.serverId)
              }
            }
          } else {
            console.error('An unexpected error occurred:', e);
          }
        } else {
          console.error('An unexpected error occurred:', error);
        }
      }
    }

    for (const subscription of expired) {
      await handleExpired(subscription);
      await simulateAsyncOperation(1500);
    }

  } catch (error) {
    console.log(error)
  }
}

export const checkPaymentOneTime = async () => {
  const maxAttempts = 3;

  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    try {
      const payments = await PaymentSchema.find({ status: 'pending' });

      for (const p of payments) {
        await checkPayment(p.paymentId, p.userId, p.price);
        await simulateAsyncOperation(1000);
      }
      break;
    } catch (error) {
      console.log(error);
      if (attempts === maxAttempts) {
        console.log("Превышено количество попыток вызова");
      }
    }
  }
}

export const allFunctionCheck = () => {

  cron.schedule('0 */6 * * *', () => {
    login();
  });

  cron.schedule('*/1 * * * *', async () => {
    try {
      await Promise.allSettled([
        checkWarningDay(),
        checkStatusSubscribes(),
      ]);
    } catch (err) {
      console.error('Cron batch error:', err);
    }
  });

  checkWarningDay()
  checkStatusSubscribes()
  checkPaymentOneTime()
  login()
}

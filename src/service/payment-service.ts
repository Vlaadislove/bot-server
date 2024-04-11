import { v4 as uuidv4 } from 'uuid';
import { createPaymentApi, getPaymentApi } from '../api/apiYoo';
import PaymentSchema from '../models/payment-model';
import SubscriptionSchema from '../models/subscription-model';
import { addClient } from './xray-service';
import { bot } from '../index'
import { InlineKeyboard } from 'grammy';


export const createPayment = async (userId: number, price: number) => {
    //TODO: Тут надо сделать проверку на то, что бы не было больше N количества счетов на проверку

    const idempotenceKeyClient = uuidv4()
    const payment = await createPaymentApi(price, idempotenceKeyClient)

    if (!payment) return { error: { message: 'Session not found' } }

    const pay = new PaymentSchema({
        userId,
        paymentId: payment.id,
        idempotenceKeyClient,
        status: payment.status,
        confirmationUrl: payment.confirmation.confirmation_url
    })
    await pay.save()

    return { paymentId: payment.id, url: payment.confirmation.confirmation_url }
}

export const checkPayment = async (paymentIdClient: string, userId: number, price: string) => {
    let response;
    let stopLoop = false;

    while (!stopLoop) {
        try {
            response = await getPaymentApi(paymentIdClient);
            console.log('Проверяем оплату:', paymentIdClient)

            if (!response) return { error: { message: 'Session not found' } }

            switch (response.status) {
                case "succeeded": {
                    console.log('Платеж в статусе: success')
                    const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient })
                    if (!payment) throw new Error('Платеж не найдет')
                    payment.status = "succeeded"
                    await payment.save()
                    succeededEvent(userId, price)
                    stopLoop = true
                    break
                }
                case "canceled": {
                    console.log('Платеж в статусе: canceled')
                    const payment = await PaymentSchema.findOne({ paymentId: paymentIdClient })
                    if (!payment) throw new Error('Платеж не найдет')
                    payment.status = "canceled"
                    await payment.save()
                    console.log(Date())
                    stopLoop = true
                    break
                }
                case "pending": {
                    console.log('Платеж в статусе: pending')
                    await simulateAsyncOperation(1000)
                    break
                }
                default:
                    throw new Error(`Неизвестный статус платежа: ${response.status}`);
            }
        } catch (error) {
            console.error('Произошла ошибка:', error);
        }
    }
}

export const succeededEvent = async (userId: number, price: string) => {
    // const sub = await SubscriptionSchema.findOne({ userId })
    // if (!sub) throw new Error('Пользователь не найден')
    // if(!sub.statusSub){

    // }

    
    const config: string = await addClient(userId)
    const user = new SubscriptionSchema({
        userId,
        config: config,
        statusSub: true,
        subExpire: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })
    await user.save()
    const oneMonthInlineBoard = new InlineKeyboard().text('Инструкция', `Инструкция`)
    await bot.api.sendMessage(userId, config, {
        reply_markup: oneMonthInlineBoard
    })
    await bot.api.sendMessage(userId, 'Это ваш конфиг, вставте его в приложение FoXray на IOS')


}


export const freeSub = async (userId: number) => {
    const sub = await SubscriptionSchema.findOne({ userId })
    if (!sub) {
        const config: string = await addClient(userId)
        const user = new SubscriptionSchema({
            userId,
            config: config,
            statusSub: true,
            subExpire: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        })
        await user.save()

        await bot.api.sendMessage(userId, config)
        await bot.api.sendMessage(userId, 'Это ваш конфиг, вставте его в приложение FoXray на IOS')
        return;
    }
}

export const canceledEvent = async () => {

}
export const pendingEvent = async () => {

}







function simulateAsyncOperation(ms: number) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve("Результат асинхронной операции");
        }, ms);
    });
}
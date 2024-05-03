import SubscriptionSchema, { ISubscription } from "../models/subscription-model"
import { bot } from '../index'
import SubscriptionFreeSchema from "../models/free-subscription-model"
import ServerSchema from "../models/server-model"
import { deleteClient } from "./xray-service"


export const checkWarningDay = async () => {

    const dayOne = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    const dayThree = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)


    const warningThreeDay = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: dayThree }, warningDay: { $nin: 3 } })
    const warningOneDay = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: dayOne }, warningDay: { $nin: 1 } })
    const warningOneDayFreeSubscribe = await SubscriptionFreeSchema.find({ statusSub: true, subExpire: { $lt: dayOne }, warningDay: { $nin: 1 } })

    console.log('warningThreeDay', warningThreeDay)
    console.log('warningOneDay', warningOneDay)
    console.log('warningOneDayFreeSubscribe', warningOneDayFreeSubscribe)

    const updateWarningDay = async (subscription: ISubscription, warningDay: number) => {
        await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $push: { warningDay } });
        await bot.api.sendMessage(subscription.userId, `Осталось ${warningDay} дня до окончания подписки!`)
    };
    const updateFreeWarningDay = async (subscription: ISubscription, warningDay: number) => {
        await SubscriptionFreeSchema.findByIdAndUpdate(subscription._id, { $push: { warningDay } });
        await bot.api.sendMessage(subscription.userId, `Осталось ${warningDay} дня до окончания бесплатной подписки!`)
    };

    warningThreeDay.forEach(subscription => updateWarningDay(subscription, 3));
    warningOneDay.forEach(subscription => updateWarningDay(subscription, 1));
    warningOneDayFreeSubscribe.forEach(subscription => updateFreeWarningDay(subscription, 1));
    setTimeout(checkWarningDay, 3000)
}

export const checkStatusSubscribes = async () => {
    const currentDay = new Date()

    const getSubscribe = await SubscriptionSchema.find({ statusSub: true, subExpire: { $lt: currentDay } })
    const getStatusSubscribeFree = await SubscriptionFreeSchema.find({ statusSub: true, subExpire: { $lt: currentDay } })

    console.log('getSubscribe', getSubscribe)
    console.log('getStatusSubscribeFree', getStatusSubscribeFree)

    const checkStatusSubscribe = async (subscription: ISubscription) => {
        await SubscriptionSchema.findByIdAndUpdate(subscription._id, { $set: { statusSub: false } });
        await deleteClient(subscription.uuid, subscription.server)
        await bot.api.sendMessage(subscription.userId, `Подписка кончилась!`)
    }
    const checkStatusSubscribeFree = async (subscription: ISubscription) => {
        await SubscriptionFreeSchema.findByIdAndUpdate(subscription._id, { $set: { statusSub: false } });
        await deleteClient(subscription.uuid, subscription.server)
        await bot.api.sendMessage(subscription.userId, `Бесплатная одписка кончилась!`)
    }

    getSubscribe.forEach(subscription => checkStatusSubscribe(subscription));
    getStatusSubscribeFree.forEach(subscription => checkStatusSubscribeFree(subscription));

    setTimeout(checkStatusSubscribes, 3000)
}
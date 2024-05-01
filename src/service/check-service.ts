import SubscriptionSchema from "../models/subscription-model"

export const checkSubscribe = async () => {
    const currentDate = new Date()
    const statusesToFind = [3, 1]
    const subscribes = await SubscriptionSchema.find({statusSub:true, subExpire: { $lt: currentDate }, warningDay:{$nin:statusesToFind}})

    console.log(subscribes)
    setTimeout(checkSubscribe, 2000)
}
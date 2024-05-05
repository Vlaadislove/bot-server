import ServerSchema from './../models/server-model';
import { InlineKeyboard } from 'grammy'
import { bot } from '../index'
import SubscriptionFreeSchema from '../models/free-subscription-model'
import UserSchema from '../models/user-model'
import { addClient } from './xray-service'



export const freeSubscription = async (userId: number) => {
    const sub = await SubscriptionFreeSchema.findOne({ userId, statusSub: true })
    const user = await UserSchema.findOne({ userId })

    if (sub || !user || user.useFreeSub) return { status: false, message: 'Ошибка при проверке бесплатной подписки' }

    const server = await checkServer()

    if (!server.cookie) return null

    const { config, uuid } = await addClient(userId, server.cookie, server.baseUrl)

    if (!config) return null

    const subscription = new SubscriptionFreeSchema({
        userId,
        config,
        server,
        uuid,
        statusSub: true,
        //TODO: удалить
        subExpire: new Date(Date.now() + 2 * 60 * 60 * 1000),
        // subExpire: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })

    user.useFreeSub = true
    await ServerSchema.findByIdAndUpdate(server.id, {
        $inc: { quantityUsers: 1 },
    }) // -1
    await user.save()
    await subscription.save()

    const oneMonthInlineBoard = new InlineKeyboard().text('🗂 Инструкция', `🗂 Инструкция`)
    await bot.api.sendMessage(userId, `<code>${config}</code>`, {
        parse_mode: 'HTML'
    })
    await bot.api.sendMessage(userId, 'Это ваш конфиг ⬆ для VPN, скопируйте его и нажмите на кнопку 🗂 Инструкция, выберите вашу операционную систему и подключайтесь к нам!', {
        reply_markup: oneMonthInlineBoard
    })
}


export function simulateAsyncOperation(ms: number) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve("Результат асинхронной операции");
        }, ms);
    });
}

export const checkServer = async () => {
    const servers = await ServerSchema.find()
    const serversFilter = servers.filter((item) => item.quantityUsers <= 100)

    let result = serversFilter[0];

    for (let i = 1; i < serversFilter.length; i++) {
        if (serversFilter[i].quantityUsers < result.quantityUsers) {
            result = serversFilter[i];
        }
    }
    return result;
};
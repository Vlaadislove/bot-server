import ServerSchema from './../models/server-model';
import { GrammyError, HttpError, InlineKeyboard } from 'grammy'
import { bot } from '../index'
import SubscriptionFreeSchema from '../models/free-subscription-model'
import UserSchema from '../models/user-model'
import { addClient } from './xray-service'



export const freeSubscription = async (userId: number) => {
    try {
        const sub = await SubscriptionFreeSchema.findOne({ userId, statusSub: true })
        const user = await UserSchema.findOne({ userId })

        if (sub || !user || user.useFreeSub) return { status: false, message: 'Ошибка при проверке бесплатной подписки' }

        const server = await checkServer()

        if (!server.cookie) return null

        const data = await addClient(userId, server.cookie, server.baseUrl)
        if (!data) return null
        const { config, uuid } = data

        const subscription = new SubscriptionFreeSchema({
            userId,
            config,
            server,
            uuid,
            statusSub: true,
            subExpire: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        })

        user.useFreeSub = true
        await ServerSchema.findByIdAndUpdate(server.id, {
            $inc: { quantityUsers: 1 },
        }) // -1
        await user.save()
        await subscription.save()

        const oneMonthInlineBoard = new InlineKeyboard().text('🗂 Инструкция', `instructions`)
        await bot.api.sendMessage(userId, '❗️<i>Обрати внимание, что этот конфиг предназначен только для одного устройства.</i>❗️', {
            parse_mode: 'HTML'
        })
        await bot.api.sendMessage(userId, `<code>${config}</code>`, {
            parse_mode: 'HTML'
        })
        await bot.api.sendMessage(userId, 'Это ваш конфиг ⬆ для VPN, скопируйте его(через долгое нажатие или просто нажмите на сообщение)  и нажмите на кнопку 🗂<b>Инструкция</b>, выберите ваше устройство и подключайтесь к нам!', {
            reply_markup: oneMonthInlineBoard,
            parse_mode: 'HTML'
        })
        console.log(`Бесплатная подписка пользователем ${userId} получена`)
    } catch (error) {
        console.log(error)
    }

}


export function simulateAsyncOperation(ms: number) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve("Результат асинхронной операции");
        }, ms);
    });
}

export const checkServer = async () => {
    const servers = await ServerSchema.find({ status: true })
    const serversFilter = servers.filter((item) => item.quantityUsers <= 100)

    let result = serversFilter[0];

    for (let i = 1; i < serversFilter.length; i++) {
        if (serversFilter[i].quantityUsers < result.quantityUsers) {
            result = serversFilter[i];
        }
    }
    return result;
};


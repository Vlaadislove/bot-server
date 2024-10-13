import ServerSchema from './../models/server-model';
import { GrammyError, HttpError, InlineKeyboard } from 'grammy'
import { bot } from '../index'
import SubscriptionFreeSchema from '../models/free-subscription-model'
import UserSchema from '../models/user-model'
import { addClient } from './xray-service'
import * as settings from "../settings"



export const freeSubscription = async (userId: number) => {
	try {
		const sub = await SubscriptionFreeSchema.findOne({ userId, statusSub: true })
		const user = await UserSchema.findOne({ userId })

		if (sub || !user || user.useFreeSub) return { status: false, message: 'Ошибка при проверке бесплатной подписки' }

		const server = await checkServer(userId)

		if (!server?.cookie) return null
		const data = await addClient(userId, server)
		if (!data) return null
		const { config, uuid } = data

		const subscription = new SubscriptionFreeSchema({
			userId,
			config,
			server,
			uuid,
			statusSub: true,
			subExpire: new Date(Date.now() + settings.FREE_DAY * 24 * 60 * 60 * 1000),
		})

		user.useFreeSub = true
		await ServerSchema.findByIdAndUpdate(server.id, {
			$inc: { quantityUsers: 1 },
		}) // -1
        await Promise.all([
            user.save(),
            subscription.save()
        ])


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
	} catch (error) {
		console.log(error)
	}

}


export function simulateAsyncOperation(ms: number) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			resolve("Результат асинхронной операции");
		}, ms);
	});
}


export const checkServer = async (userId:number) => {
	const servers = await ServerSchema.find({ status: true })
	const serversFilter = servers.filter((item) => item.quantityUsers <= settings.MAX_USERS_ON_SERVER)

	let result = serversFilter[0];
    if(!result){
        await bot.api.sendMessage(userId, `<b>БЕЗ ПАНИНКИ!</b> При попытки добавить вас в список разрешенных пользователей произошла ошибка, вероятно сервера перегружены, пожалуйста напишите мне ${settings.SUPPORT_NAME} и мы все решим! Просим прощение за доставленые неудобства, сделаем подарок!`, {
			parse_mode: 'HTML'
		})
        return
    }
	for (let i = 1; i < serversFilter.length; i++) {
		if (serversFilter[i].quantityUsers < result.quantityUsers) {
			result = serversFilter[i];
		}
	}
	return result;
};


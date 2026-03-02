import ServerSchema from './../models/server-model';
import { InlineKeyboard } from 'grammy'
import { bot } from '../index'
import SubscriptionSchema from '../models/subscription-model'
import UserSchema from '../models/user-model'
import { addClient } from './xray-service'
import * as settings from "../settings"
import { v4 as uuidv4 } from 'uuid';


export const ensureUserTokens = async (userId: number) => {
	const user = await UserSchema.findOne({ userId });
	if (!user) return null;
	if (!user.uuid) user.uuid = uuidv4();
	if (!user.subToken) user.subToken = uuidv4().replace(/-/g, '').slice(0, 16);
	await user.save();
	return user;
};


export const checkAllServers = async () => {
	const servers = await ServerSchema.find({ status: true });
	return servers.filter(s => s.quantityUsers <= settings.MAX_USERS_ON_SERVER);
};


export const checkServer = async (userId: number) => {
	const servers = await ServerSchema.find({ status: true })
	const serversFilter = servers.filter((item) => item.quantityUsers <= settings.MAX_USERS_ON_SERVER)

	let result = serversFilter[0];
	if (!result) {
		await bot.api.sendMessage(userId, `<b>БЕЗ ПАНИКИ!</b> При попытки добавить вас в список разрешенных пользователей произошла ошибка, вероятно сервера перегружены, пожалуйста напишите мне ${settings.SUPPORT_NAME} и мы все решим! Просим прощение за доставленые неудобства, сделаем подарок!`, {
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


export const freeSubscription = async (userId: number) => {
	try {
		const existingFreeSub = await SubscriptionSchema.findOne({ userId, statusSub: true, type: 'free' })
		const user = await ensureUserTokens(userId)

		if (existingFreeSub || !user || user.useFreeSub) {
			return { status: false, message: 'Ошибка при проверке бесплатной подписки' }
		}

		const servers = await checkAllServers()
		if (!servers.length) {
			await bot.api.sendMessage(userId, `<b>БЕЗ ПАНИКИ!</b> Сервера перегружены, пожалуйста напишите мне ${settings.SUPPORT_NAME}!`, {
				parse_mode: 'HTML'
			})
			return null
		}

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
			type: 'free',
			statusSub: true,
			subExpire: new Date(Date.now() + settings.FREE_DAY * 24 * 60 * 60 * 1000),
			servers: serverEntries,
		})

		user.useFreeSub = true
		await Promise.all([user.save(), subscription.save()])

		await sendSubMessage(userId, user.subToken!)
	} catch (error) {
		console.log(error)
	}
}


export const sendSubMessage = async (userId: number, subToken: string) => {
	const subUrl = `${settings.SERVER_URL}/subscription/${subToken}`
	const instructionBoard = new InlineKeyboard().text('🗂 Инструкция', 'instructions')
	await bot.api.sendMessage(userId, `<code>${subUrl}</code>`, { parse_mode: 'HTML' })
	await bot.api.sendMessage(userId, `Скопируйте ссылку выше и вставьте в приложение (v2ray, Hiddify и др.) — она понадобится для подключения к VPN.\n\n<b>Спасибо что выбрали VPNinja</b> ❤️`, {
		parse_mode: 'HTML',
		reply_markup: instructionBoard,
	})
}


export function simulateAsyncOperation(ms: number) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			resolve("Результат асинхронной операции");
		}, ms);
	});
}


type NormalizedWebhook = { paymentId: string; status: string };

export const normalizeWebhook = (payload: any): NormalizedWebhook | null => {
	const obj = payload?.object;
	const paymentId = obj?.id;
	const status = obj?.status;

	if (typeof paymentId !== 'string' || typeof status !== 'string') {
		return null;
	}
	return { paymentId, status };
};

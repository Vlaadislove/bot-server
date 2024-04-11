import axios, { AxiosHeaderValue } from "axios"
import * as settings from "../settings"
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs'
import { bot } from '../index'
import { addClientApi, loginApi } from "../api/apiXray";


export const login = async () => {
    try {
        const userData = {
            'username': `${settings.VPN_USER}`,
            'password': `${settings.VPN_PASSWORD}`,
        };
        const response = await loginApi(userData)
        if (!response) throw new Error('Ошбика получения login')

        const cookie = response.headers['set-cookie'] && response.headers['set-cookie'].join('; ');

        if (cookie) {
            await fs.writeFile('cookie.txt', cookie)
            console.log('Строка успешно записана в файл:', 'cookie.txt')
        }

    } catch (error) {
        console.error('Ошибка при записи в файл:', error);
    }
}

export const readCookie = async () => {
    try {
        const data = await fs.readFile('cookie.txt', 'utf8')
        return data
    } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        throw error;
    }
}

export const addClient = async (tgId: number) => {
    const uuid = uuidv4()
    const subId = uuidv4().replace(/-/g, '')
    const cookie = await readCookie()
    const data = {
        "id": 1,
        "settings": `{\"clients\":[{\"id\":\"${uuid}\",\"flow\":\"xtls-rprx-vision\",\"email\":\"${tgId}\",\"limitIp\":0,\"totalGB\":0,\"expiryTime\":0,\"enable\":true,\"tgId\":\"\",\"subId\":\"${subId}\",\"reset\":0}]}`
    }

    const response = await addClientApi(data, cookie)
    if (!response) throw new Error('Ошибка добавления клиента')
    if (response.data.success) {
        const config = `vless://${uuid}@95.164.7.217:443?type=tcp&security=reality&pbk=${settings.VPN_PUBLIC_KEY}&fp=firefox&sni=yahoo.com&sid=bf152d81&spx=%2F&flow=xtls-rprx-vision#Freinds-${tgId}`
        return config
    } else {
        throw new Error('Не удалось отправить конфиг')
    }
}

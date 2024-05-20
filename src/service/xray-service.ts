import * as settings from "../settings"
import { v4 as uuidv4 } from 'uuid';
import { addClientApi, deleteClientApi, loginApi } from "../api/apiXray";
import ServerSchema from "../models/server-model";

interface AddClientResponse {
    config: string;
    uuid: string;
}

export const login = async () => {
    try {
        const servers = await ServerSchema.find()
        for (let i = 0; i < servers.length; i++) {
            const userData = {
                'username': `${servers[i].username}`,
                'password': `${servers[i].password}`,
                'loginSecret': `${servers[i].loginSecret}`,
            };
            const response = await loginApi(userData, servers[i].baseUrl)
            if (!response) throw new Error('Ошбика получения login')

            const cookie = response.headers['set-cookie'] && response.headers['set-cookie'].join('; ');
            await ServerSchema.findByIdAndUpdate(servers[i].id, {
                $set: { cookie: cookie },
            })
            console.log("Куки для:", servers[i].serverName, 'обновлены')
        }
    } catch (error) {
        console.error('Ошибка при записи в DB:', error);
    }
}


export const addClient = async (tgId: number, cookie: string, baseUrl: string): Promise<AddClientResponse | null> => {
    const uuid: string = uuidv4()
    const subId: string = uuidv4().replace(/-/g, '')
    // const cookie = await readCookie()
    const data = {
        "id": 1,
        "settings": `{\"clients\":[{\"id\":\"${uuid}\",\"flow\":\"xtls-rprx-vision\",\"email\":\"${tgId}\",\"limitIp\":0,\"totalGB\":0,\"expiryTime\":0,\"enable\":true,\"tgId\":\"\",\"subId\":\"${subId}\",\"reset\":0}]}`
    }
    try {
        const response = await addClientApi(data, cookie, baseUrl)
        if (!response) throw new Error('Ошибка добавления клиента')
            // console.log(response.data)
        if (response.data.success) {
            const config: string = `vless://${uuid}@95.164.7.217:443?type=tcp&security=reality&pbk=${settings.VPN_PUBLIC_KEY}&fp=firefox&sni=yahoo.com&sid=bf152d81&spx=%2F&flow=xtls-rprx-vision#Freinds-${tgId}`
            return { config, uuid }
        } else {
            console.log('Не удалось отправить конфиг', response.data.success)
            return null
        }
    } catch (error) {
        console.log(error)
        return null
    }

}


export const deleteClient = async (uuid: string, server: Object) => {
    try {
        const getServer = await ServerSchema.findByIdAndUpdate(server, { $inc: { quantityUsers: -1 } }, { new: true })
        if (!getServer) {
            console.log('Cервер не найден')
            return
        }
        await deleteClientApi(uuid, getServer.cookie, getServer.baseUrl)

    } catch (error) {
        console.log(error)
    }
}
import * as settings from "../settings"
import { v4 as uuidv4 } from 'uuid';
import { addClientApi, deleteClientApi, loginApi } from "../api/apiXray";
import ServerSchema, { IServer } from "../models/server-model";
import { authenticator } from 'otplib';


interface AddClientResponse {
  config: string;
  uuid: string;
}

export const login = async () => {

  try {
    //TODO сделать что б куки спрашиало у серверов у который status: true
    const servers = await ServerSchema.find()

    for (let i = 0; i < servers.length; i++) {
      const code = authenticator.generate(servers[i].twoFactorCode);
      const userData = {
        'username': `${servers[i].username}`,
        'password': `${servers[i].password}`,
        'twoFactorCode': `${code}`,
      };

      const response = await loginApi(userData, servers[i].baseUrl)

      if (!response) throw new Error('Ошбика получения login')
      const cookie = response.headers['set-cookie'] && response.headers['set-cookie'].pop();
      if (!cookie) {
        throw new Error('Not found cookie');
      }

      await ServerSchema.findByIdAndUpdate(servers[i].id, {
        $set: { cookie: cookie },
      })
      console.log("Куки для:", servers[i].serverName, 'обновлены', new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }))
    }
  } catch (error) {
    console.error('Ошибка при записи в DB:', error);
  }
}


export const addClient = async (tgId: number, server: IServer): Promise<AddClientResponse | null> => {
  const uuid: string = uuidv4()
  const subId: string = uuidv4().replace(/-/g, '')
  const data = {
    "id": 1,
    "settings": `{\"clients\":[{\"id\":\"${uuid}\",\"flow\":\"xtls-rprx-vision\",\"email\":\"${tgId}\",\"limitIp\":0,\"totalGB\":0,\"expiryTime\":0,\"enable\":true,\"tgId\":\"\",\"subId\":\"${subId}\",\"reset\":0}]}`
  }
  try {

    const response = await addClientApi(data, server.cookie, server.baseUrl)
    if (!response) throw new Error('Ошибка добавления клиента')
    if (response.data.success) {
      const config: string = `vless://${uuid}@${server.ip}?type=tcp&encryption=none&security=reality&pbk=${server.publickKey}&fp=random&sni=nu.nl&sid=${server.sidId}&spx=%2F&flow=xtls-rprx-vision#VPNinja-${tgId}`
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
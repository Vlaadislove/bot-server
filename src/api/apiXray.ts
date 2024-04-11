import axios, { AxiosHeaderValue } from "axios"
import querystring from 'querystring';

interface IUserData {
    [key: string]: string;
    username: string;
    password: string;
}


interface IClientData {
    id: number;
    settings: string;
}

const instance = axios.create({
    baseURL: 'https://miraclewebsite.freemyip.com:5555',
    // timeout: 10000, 
});


export const loginApi = async (userData: IUserData) => {
    try {
        const response = await instance.post('/login', querystring.stringify(userData))
        return response
    } catch (error) {
        console.log(error)
    }
}

export const addClientApi = async (data:IClientData, cookie:string)=>{
    try {
        const response = await instance.post('/panel/api/inbounds/addClient', data, { headers: { 'Cookie': cookie } })
        return response
    } catch (error) {
        console.log(error)
    }
}
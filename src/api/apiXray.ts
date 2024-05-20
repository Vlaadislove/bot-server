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

// const instance = axios.create({
//     baseURL: 'http://95.164.7.217:5555',
// });


export const loginApi = async (userData: IUserData, baseUrl: string) => {
    try {
        const response = await axios.post(`${baseUrl}/login`, querystring.stringify(userData))
        return response
    } catch (error) {
        console.log(error)
    }
}

export const addClientApi = async (data: IClientData, cookie: string, baseUrl: string) => {
    try {
        const response = await axios.post(`${baseUrl}/panel/api/inbounds/addClient`, data, { headers: { 'Cookie': cookie } })
        return response
    } catch (error) {
        console.log(error)
    }
}


export const deleteClientApi = async (uuid: string, cookie: string, baseUrl: string) => {
    try {
        
        const response = await axios.post(`${baseUrl}/panel/api/inbounds/1/delClient/${uuid}`,null, { headers: { 'Cookie': cookie } })
        // console.log(response.data)
        return response
    } catch (error) {
        console.log(error)
    }
}
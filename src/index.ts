import express, { Express } from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cors from 'cors'
import * as settings from "./settings"
import { Bot} from 'grammy'
import paymentRoute from './routes/payment'
import { checkServer } from './service/other-service'
// import { deleteClient, login } from './service/xray-service'
import {checkStatusSubscribes, checkWarningDay } from './service/check-service'



dotenv.config()

let app: Express = express()
export const bot = new Bot(settings.BOT_TOKEN)

app.use(express.json())
app.use(cors());


app.use('/payment', paymentRoute)


async function start() {
    try {
        await mongoose.connect(settings.DB_URL).then(() => console.log('Mongoose подключен к базе данных.'))
        app.listen(settings.PORT_SERVER, () => console.log(`Server started on port: ${settings.PORT_SERVER}`))
    } catch (error) {
        console.log(error);
    }
}

start()

// checkStatusSubscribes()
// checkWarningDay()
// freeSubscription(851094841)

// addClient(432432432)
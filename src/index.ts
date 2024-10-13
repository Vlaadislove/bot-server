import express, { Express } from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import * as settings from "./settings"
import { Bot } from 'grammy'
import { autoRetry } from "@grammyjs/auto-retry";
import paymentRoute from './routes/payment'
import { allFunctionCheck } from './service/check-service'


export const bot = new Bot(settings.BOT_TOKEN)
bot.api.config.use(autoRetry({
    maxRetryAttempts: 1,
    maxDelaySeconds: 5, 
}))


let app: Express = express()
app.use(express.json())
app.use(cors());


app.use('/payment', paymentRoute)


async function start() {
    try {
        await mongoose.connect(settings.DB_URL).then(() => console.log('Mongoose подключен к базе данных.'))
        app.listen(settings.PORT_SERVER, () => console.log(`Server started on port: ${settings.PORT_SERVER}`))
        allFunctionCheck()
    } catch (error) {
        console.log(error);
    }
}

start()
import dotenv from 'dotenv'
dotenv.config()

export const PORT_SERVER = process.env.PORT_SERVER || 8000
export const DB_URL = process.env.DB_URL || ''

export const BOT_TOKEN = process.env.BOT_TOKEN || ' '

export const YM_SHOP_IP = process.env.YM_SHOP_IP || ' '
export const YM_SECRET_KEY = process.env.YM_SECRET_KEY || ' '

export const FREE_DAY = Number(process.env.FREE_DAY) || 0
export const DAY_FOR_INVITE = Number(process.env.DAY_FOR_INVITE) || 0
export const MAX_USERS_ON_SERVER = Number(process.env.MAX_USERS_ON_SERVER) || 0

export const NAME_TG_BOT = process.env.NAME_TG_BOT || ' '
export const SUPPORT_NAME = process.env.SUPPORT_NAME || ' '




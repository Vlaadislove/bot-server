import dotenv from 'dotenv'
dotenv.config()

export const PORT_SERVER = process.env.PORT_SERVER || 8000
export const DB_URL = process.env.DB_URL || ''

export const VPN_PUBLIC_KEY = process.env.VPN_PUBLIC_KEY || ''

export const BOT_TOKEN = process.env.BOT_TOKEN || ' '

export const YM_SHOP_IP = process.env.YM_SHOP_IP || ' '
export const YM_SECRET_KEY = process.env.YM_SECRET_KEY || ' '



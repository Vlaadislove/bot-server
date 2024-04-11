import dotenv from 'dotenv'
dotenv.config()

export const PORT_SERVER = process.env.PORT_SERVER || 8000
export const DB_URL = process.env.DB_URL || ''

export const VPN_USER = process.env.VPN_USER || ''
export const VPN_PASSWORD = process.env.VPN_PASSWORD || ''
export const VPN_PUBLIC_KEY = process.env.VPN_PUBLIC_KEY || ''

export const BOT_TOKEN = process.env.BOT_TOKEN || ' '

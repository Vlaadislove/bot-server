import mongoose, { Document } from "mongoose";

export interface IServer extends Document {
	serverName: string
	username: string
	status: boolean
	password: string
	twoFactorCode: string
	sidId: string
	ip: string
	quantityUsers: number
	baseUrl: string
	cookie: string
    publickKey:string
}

export const ServerSchema = new mongoose.Schema(
	{
		serverName: {
			type: String,
			required: true,
		},
		username: {
			type: String,
			required: true,
		},
		status: {
			type: Boolean,
			required: true,
		},
		password: {
			type: String,
			required: true,
		},
		twoFactorCode: {
			type: String,
			required: true,
		},
		sidId: {
			type: String,
			required: true,
		},
		quantityUsers: {
			type: Number,
			required: true,
		},
		baseUrl: {
			type: String,
			required: true,
		},
		cookie: {
			type: String,
			required: true,
		},
		ip: {
			type: String,
			required: true,
		},
		publickKey: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true, collection: "server" }
);

export default mongoose.model('Server', ServerSchema)

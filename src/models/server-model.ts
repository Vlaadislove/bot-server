import mongoose from "mongoose";

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
    },
    { timestamps: true, collection: "server" }
);

export default mongoose.model('Server', ServerSchema)

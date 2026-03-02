import mongoose, { Document, Types } from "mongoose";

export interface IServerEntry {
    serverId: Types.ObjectId;
    config: string;
}

export interface ISubscription extends Document {
    userId: number;
    type: 'paid' | 'free' | 'friend';
    statusSub: boolean;
    subExpire: Date;
    warningDay: number[];
    servers: IServerEntry[];
}

export const SubscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['paid', 'free', 'friend'],
            required: true,
        },
        statusSub: {
            type: Boolean,
            required: true,
        },
        subExpire: {
            type: Date,
            required: true,
        },
        warningDay: {
            type: [Number],
            default: [],
        },
        servers: [
            {
                serverId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Server',
                    required: true,
                },
                config: {
                    type: String,
                    required: true,
                },
            },
        ],
    },
    { timestamps: true, collection: "subscription" }
);

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema)

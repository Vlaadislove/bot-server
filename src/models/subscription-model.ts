import mongoose, { Model, Document, Types } from "mongoose";

export interface ISubscription extends Document {
    userId: number;
    config: string;
    uuid: string;
    statusSub: boolean;
    subExpire: Date;
    warningDay: number[];
    server: Types.ObjectId;
    expireAt?: Date | null | undefined;
    // createdAt: Date;
    // updatedAt: Date;
}

export const SubscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: Number,
            required: true,
        },
        config: {
            type: String,
            required: true,
        },
        uuid: {
            type: String,
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
        expiresAt: {
            type: Date,
        },
        warningDay: {
            type: [Number]
        },
        server: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Server',
            required: true,
        }
    },
    { timestamps: true, collection: "subscription" }
);

export default mongoose.model('Subscription', SubscriptionSchema)
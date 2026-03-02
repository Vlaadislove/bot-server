import mongoose, { Document } from "mongoose";

export interface IPromo extends Document {
    code: string;
    isUsed: boolean;
    usedBy?: number;
    usedAt?: Date;
    daysValid?: number;
}

const PromoSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        isUsed: { type: Boolean, default: false },
        usedBy: { type: Number },
        usedAt: { type: Date },
        daysValid: { type: Number },
    },
    { timestamps: true, collection: "promo" }
);

export default mongoose.model<IPromo>("Promo", PromoSchema);

import mongoose, { Document } from "mongoose";

export interface IPromo extends Document {
    code: string;
    isUsed: boolean;
    usedBy?: number;
    usedAt?: Date;
}

const PromoSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        isUsed: { type: Boolean, default: false },
        usedBy: { type: Number },
        usedAt: { type: Date },
    },
    { timestamps: true, collection: "promo" }
);

export default mongoose.model<IPromo>("Promo", PromoSchema);

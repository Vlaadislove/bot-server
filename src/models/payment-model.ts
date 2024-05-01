import mongoose, { Model, Document, Types } from "mongoose";



export const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    idempotenceKeyClient: {
      type: String,
      required: true,
    },
    confirmationUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 90);
        return date;
      },
    },
  },
  { timestamps: true, collection: "payment" }
);

export default mongoose.model('Payment', PaymentSchema)
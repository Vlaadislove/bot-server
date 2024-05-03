import mongoose, { Model, Document, Types } from "mongoose";



export const SubscriptionFreeSchema = new mongoose.Schema(
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
      required: true
    }
  },
  { timestamps: true, collection: "subscription-free" }
);

export default mongoose.model('SubscriptionFree', SubscriptionFreeSchema)
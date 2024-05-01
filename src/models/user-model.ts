import mongoose from "mongoose";

export const UserSchema = new mongoose.Schema(
    {
      userId: {
        type: Number,
        required: true,
      },
      inviteId: {
        type: mongoose.Schema.Types.Mixed,
      },
      username: {
        type: String,
        required: true,
      },
      first_name: {
        type: String,
      },
      last_name: {
        type: String,
      },
      useFreeSub: {
        type:Boolean,
        default: false
      }
    },
    { timestamps: true, collection: "users" }
  );

export default mongoose.model('Users', UserSchema)






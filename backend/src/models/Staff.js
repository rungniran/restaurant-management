import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "cashier", "waiter", "kitchen"],
      default: "waiter",
    },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    // Bumped every time the password is changed/reset. Embedded in the JWT so
    // that any token issued before a password change is rejected immediately,
    // instead of staying valid for up to 12h after the owner thought they'd
    // secured the account.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);

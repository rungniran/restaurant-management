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
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);

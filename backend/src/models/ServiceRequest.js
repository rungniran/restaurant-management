import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    type: {
      type: String,
      enum: ["call_staff", "request_bill", "need_utensils", "need_water", "other"],
      default: "call_staff",
    },
    note: { type: String, default: "" },
    status: { type: String, enum: ["pending", "acknowledged"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceRequest", serviceRequestSchema);

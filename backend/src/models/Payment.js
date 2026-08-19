import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    tableIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Table" }], // all tables covered (merged bill)
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    amount: { type: Number, required: true },
    method: { type: String, enum: ["promptpay", "cash", "card", "buffet"], default: "promptpay" },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    promptPayPayload: { type: String, default: "" },
    paidAt: Date,

    // Split-bill support
    splitType: { type: String, enum: ["full", "equal", "items", "buffet"], default: "full" },
    splitIndex: { type: Number, default: null }, // which person (1-based) when splitType=equal
    splitTotal: { type: Number, default: null }, // total number of people splitting
    itemRefs: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        itemId: { type: mongoose.Schema.Types.ObjectId },
      },
    ], // specific order items covered, when splitType=items

    receiptNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

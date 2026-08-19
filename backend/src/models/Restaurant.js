import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    displayName: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    isOpen: { type: Boolean, default: false },
    promptPayId: { type: String, default: "" }, // เบอร์โทร/เลขบัตร ปชช. สำหรับ PromptPay
    serviceChargePercent: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 0 },
    pricingMode: { type: String, enum: ["normal", "buffet"], default: "normal" },
    buffetPricePerPerson: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", restaurantSchema);

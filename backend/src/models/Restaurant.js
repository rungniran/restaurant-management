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
    taxId: { type: String, default: "" }, // เลขประจำตัวผู้เสียภาษี 13 หลัก
    branchName: { type: String, default: "สำนักงานใหญ่" }, // ชื่อสาขา เช่น สำนักงานใหญ่ หรือ สาขาที่ 00001
    pricingMode: { type: String, enum: ["normal", "buffet"], default: "normal" },
    buffetPricePerPerson: { type: Number, default: 0 },
    buffetDurationMinutes: { type: Number, default: 90 }, // ระยะเวลากินบุฟเฟต์ (นาที)
    lineNotifyToken: { type: String, default: "" }, // LINE Notify Token สำหรับแจ้งเตือนกลุ่มพนักงาน
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", restaurantSchema);

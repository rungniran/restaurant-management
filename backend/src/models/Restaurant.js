import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    displayName: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    isOpen: { type: Boolean, default: false },
    subscriptionStatus: { type: String, enum: ["trial", "active", "past_due", "cancelled"], default: "trial" },
    trialEndsAt: { type: Date, default: () => addMonths(new Date(), 3) },
    paidUntil: { type: Date, default: null },
    monthlyPrice: { type: Number, default: 1490 },
    promptPayId: { type: String, default: "" }, // เบอร์โทร/เลขบัตร ปชช. สำหรับ PromptPay
    serviceChargePercent: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 0 },
    taxId: { type: String, default: "" }, // เลขประจำตัวผู้เสียภาษี 13 หลัก
    branchName: { type: String, default: "สำนักงานใหญ่" }, // ชื่อสาขา เช่น สำนักงานใหญ่ หรือ สาขาที่ 00001
    pricingMode: { type: String, enum: ["normal", "buffet"], default: "normal" },
    buffetPricePerPerson: { type: Number, default: 0 },
    buffetDurationMinutes: { type: Number, default: 90 }, // ระยะเวลากินบุฟเฟต์ (นาที)
    buffetAdultPrice: { type: Number, default: 0 },
    buffetChildPrice: { type: Number, default: 0 },
    buffetChildMaxAge: { type: Number, default: 12 },
    buffetOvertimeFeePerPerson: { type: Number, default: 0 },
    buffetDepositPerPerson: { type: Number, default: 0 },
    buffetPackages: [
      {
        name: { type: String, required: true },
        adultPrice: { type: Number, min: 0, required: true },
        childPrice: { type: Number, min: 0, default: 0 },
        durationMinutes: { type: Number, min: 15, default: 90 },
        overtimeFeePerPerson: { type: Number, min: 0, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    lineNotifyToken: { type: String, default: "" }, // LINE Notify Token สำหรับแจ้งเตือนกลุ่มพนักงาน
  },
  { timestamps: true }
);

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export default mongoose.model("Restaurant", restaurantSchema);

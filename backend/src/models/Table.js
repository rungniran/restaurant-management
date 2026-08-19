import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableNumber: { type: String, required: true },
    zone: { type: String, default: "A" },
    qrToken: { type: String, required: true, unique: true }, // token สุ่ม ผูกกับโต๊ะ ใช้แทน id ตรงๆ ใน URL
    status: {
      type: String,
      enum: ["available", "occupied", "ordering", "waiting_bill", "paid", "cleaning"],
      default: "available",
    },
    isActive: { type: Boolean, default: true }, // สำหรับ disable QR

    // ทำเครื่องหมายเริ่มมื้อปัจจุบัน — ใช้กรองไม่ให้ order/bill ของลูกค้ารอบก่อนหน้า
    // (มื้อที่จ่ายและปล่อยโต๊ะไปแล้ว) โผล่มาปนกับลูกค้ารอบใหม่ที่สแกน QR โต๊ะเดิม
    sessionStartedAt: { type: Date, default: Date.now },

    // ต่อโต๊ะ (merge tables for shared billing) — tables sharing the same groupId
    // are billed together. isGroupPrimary marks the "main" table of the group.
    groupId: { type: String, default: null },
    isGroupPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model("Table", tableSchema);

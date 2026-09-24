import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    unit: { type: String, enum: ["kg", "g", "l", "ml", "piece", "pack"], default: "piece" },
    stock: { type: Number, min: 0, default: 0 },
    reorderPoint: { type: Number, min: 0, default: 0 },
    costPerUnit: { type: Number, min: 0, default: 0 },
    supplier: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export default mongoose.model("InventoryItem", inventoryItemSchema);
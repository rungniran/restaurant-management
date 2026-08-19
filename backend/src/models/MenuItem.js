import mongoose from "mongoose";

const optionChoiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    extraPrice: { type: Number, default: 0 },
  },
  { _id: false }
);

const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "ความเผ็ด"
    type: { type: String, enum: ["single", "multiple"], default: "single" },
    required: { type: Boolean, default: false },
    choices: [optionChoiceSchema],
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    station: {
      type: String,
      enum: ["kitchen", "drink", "dessert", "grill"],
      default: "kitchen",
    },
    options: [optionGroupSchema],
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", menuItemSchema);

import mongoose from "mongoose";

const selectedOptionSchema = new mongoose.Schema(
  {
    groupName: String,
    choice: String,
    extraPrice: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // base price at time of order
  quantity: { type: Number, required: true, default: 1 },
  selectedOptions: [selectedOptionSchema],
  note: { type: String, default: "" },
  station: {
    type: String,
    enum: ["kitchen", "drink", "dessert", "grill"],
    default: "kitchen",
  },
  itemStatus: {
    type: String,
    enum: ["new", "accepted", "cooking", "done", "cancelled"],
    default: "new",
  },
  lineTotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    orderNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "cooking", "served", "cancelled"],
      default: "pending",
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    acceptedAt: Date,
    servedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

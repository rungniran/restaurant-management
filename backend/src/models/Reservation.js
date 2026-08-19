import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true }],
    customerName: { type: String, required: true },
    phone: { type: String, default: "" },
    partySize: { type: Number, default: 1 },
    reservedFor: { type: Date, required: true }, // date/time of reservation
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["booked", "confirmed", "seated", "completed", "cancelled", "no_show"],
      default: "booked",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Reservation", reservationSchema);

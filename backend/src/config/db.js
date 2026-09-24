import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/qr_food_order";
  try {
    await mongoose.connect(uri);
    // Never log the connection string: it contains the database username and password.
    console.log("[MongoDB] connected successfully");
  } catch (err) {
    // Driver error messages may include connection details; keep logs credential-free.
    console.error("[MongoDB] connection error:", err.name || "UnknownError");
    process.exit(1);
  }
}

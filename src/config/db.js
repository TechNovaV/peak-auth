const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // Debug an toàn: log 25 ký tự đầu (đủ thấy scheme) + độ dài, KHÔNG lộ password
  console.log(
    `[DB] MONGODB_URI prefix="${uri ? uri.slice(0, 25) : "UNDEFINED"}", length=${uri ? uri.length : 0}`
  );

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

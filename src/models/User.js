const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // cho phép null trùng nhau (user cũ chưa có email)
      unique: true,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    refreshToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null, index: true },
    resetPasswordExpires: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, index: true },
    emailVerificationExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

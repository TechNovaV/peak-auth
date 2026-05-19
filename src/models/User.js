const mongoose = require("mongoose");

// Mỗi session = 1 lần login (1 thiết bị/browser)
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastUsed: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    fullName: { type: String, default: "", trim: true },
    bio: { type: String, default: "", maxlength: 500 },
    school: { type: String, default: "", maxlength: 100, trim: true },
    class: { type: String, default: "", maxlength: 50, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    sessions: { type: [sessionSchema], default: [] },
    resetPasswordToken: { type: String, default: null, index: true },
    resetPasswordExpires: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, index: true },
    emailVerificationExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

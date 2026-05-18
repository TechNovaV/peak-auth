const required = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Thiếu biến môi trường: ${key}`);
    process.exit(1);
  }
});

if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error("❌ JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau");
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL: "15m",
  REFRESH_TOKEN_TTL: "7d",
  REFRESH_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
  RESET_TOKEN_TTL_MS: 15 * 60 * 1000, // 15 phút
  VERIFY_TOKEN_TTL_MS: 24 * 60 * 60 * 1000, // 24 giờ
  SALT_ROUNDS: 12,
};

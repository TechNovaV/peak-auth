const rateLimit = require("express-rate-limit");
const { NODE_ENV } = require("../config/env");

// Trong test: skip rate limit (test chạy nhiều request liên tiếp, không có giá trị
// gì khi bị 429). Trong prod/dev vẫn áp dụng bình thường.
const noop = (_req, _res, next) => next();

const authLimiter =
  NODE_ENV === "test"
    ? noop
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút." },
      });

module.exports = { authLimiter };

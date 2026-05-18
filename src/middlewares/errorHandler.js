const { NODE_ENV } = require("../config/env");

module.exports = (err, req, res, _next) => {
  // Trong test: không log lỗi 4xx (test cố ý kích) — tránh nhiễu output
  if (NODE_ENV !== "test" || !err.status || err.status >= 500) {
    console.error("[ERROR]", err);
  }

  const status = err.status || 500;
  const message =
    err.status && err.status < 500
      ? err.message
      : "Lỗi hệ thống, vui lòng thử lại.";

  res.status(status).json({
    message,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
};

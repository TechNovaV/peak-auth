const jwt = require("jsonwebtoken");
const { JWT_ACCESS_SECRET } = require("../config/env");
const { httpError } = require("../utils/validators");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next(httpError(401, "Chưa đăng nhập"));

  try {
    req.user = jwt.verify(token, JWT_ACCESS_SECRET);
    next();
  } catch {
    next(httpError(403, "Token không hợp lệ hoặc đã hết hạn"));
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) return next(httpError(403, "Không có quyền"));
  next();
};

module.exports = { verifyToken, requireRole };

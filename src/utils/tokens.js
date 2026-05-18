const crypto = require("crypto");

/**
 * Sinh cặp { raw, hash } cho reset password / email verify token.
 * - raw: gửi cho user qua email (không lưu DB)
 * - hash: lưu DB để so sánh khi user gửi lại
 *
 * Lưu HASH thay vì RAW: nếu DB leak, attacker không reset được password.
 */
const generateToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
};

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

module.exports = { generateToken, hashToken };

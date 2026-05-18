const User = require("../models/User");
const { httpError } = require("../utils/validators");

const ALLOWED_ROLES = ["user", "admin"];

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -refreshToken").lean();
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ALLOWED_ROLES.includes(role))
      throw httpError(400, `Role phải là một trong: ${ALLOWED_ROLES.join(", ")}`);

    // Chặn admin tự hạ quyền chính mình (tránh khóa cả hệ thống nếu chỉ có 1 admin)
    if (req.user.sub === id && role !== "admin")
      throw httpError(400, "Không thể tự hạ quyền admin của chính mình");

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { returnDocument: "after", runValidators: true }
    ).select("-password -refreshToken");

    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    res.json({ message: "Cập nhật role thành công", user });
  } catch (err) {
    // Nếu id không đúng định dạng ObjectId, Mongoose trả CastError
    if (err.name === "CastError") return next(httpError(400, "ID không hợp lệ"));
    next(err);
  }
};

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Đảm bảo thư mục avatars tồn tại
const AVATAR_DIR = path.join(__dirname, "..", "..", "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // <userId>-<random>.<ext> — tránh trùng + dễ debug
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const rand = crypto.randomBytes(8).toString("hex");
    cb(null, `${req.user.sub}-${rand}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Chỉ chấp nhận JPG, PNG hoặc WebP"));
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// Convert multer errors → HTTP error tiếng Việt thân thiện
const handleAvatarUploadErrors = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ message: "Ảnh quá lớn (tối đa 2MB)" });
    return res.status(400).json({ message: err.message });
  }
  if (err && err.message?.includes("JPG, PNG")) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

module.exports = { uploadAvatar, handleAvatarUploadErrors, AVATAR_DIR };

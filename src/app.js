const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middlewares/errorHandler");
const { CLIENT_URL } = require("./config/env");

const app = express();

// Render/Railway chạy app sau reverse proxy. Cần trust proxy để:
//   - req.ip lấy đúng IP client (cho rate limit)
//   - secure cookie hoạt động đúng (cookie.secure=true chỉ set khi req.secure=true)
app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
// CLIENT_URL có thể là 1 hoặc nhiều origin (phân cách bằng dấu phẩy).
// Ví dụ trong .env: CLIENT_URL=http://localhost:5173,https://my-app.vercel.app
const allowedOrigins = CLIENT_URL.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Cho phép request không có origin (Postman, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin không được phép"));
    },
    credentials: true,
  })
);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) =>
  res.status(404).json({ message: "Không tìm thấy endpoint" })
);
app.use(errorHandler);

module.exports = app;

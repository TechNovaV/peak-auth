const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middlewares/errorHandler");
const swaggerSpec = require("./config/swagger");
const { CLIENT_URL } = require("./config/env");

const app = express();

// Render/Railway chạy app sau reverse proxy. Cần trust proxy để:
//   - req.ip lấy đúng IP client (cho rate limit)
//   - secure cookie hoạt động đúng (cookie.secure=true chỉ set khi req.secure=true)
app.set("trust proxy", 1);

// Tắt Content-Security-Policy vì conflict với Swagger UI inline scripts.
// Các header bảo vệ khác (HSTS, X-Frame-Options, ...) vẫn được helmet set.
// API không serve HTML user-generated nên CSP ít giá trị.
app.use(helmet({ contentSecurityPolicy: false }));
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

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Trả về JSON status ok. Dùng cho monitoring/uptime.
 *     responses:
 *       200:
 *         description: Service đang chạy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "ok" }
 */
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Peak Auth API Docs",
    swaggerOptions: { persistAuthorization: true },
  })
);
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) =>
  res.status(404).json({ message: "Không tìm thấy endpoint" })
);
app.use(errorHandler);

module.exports = app;

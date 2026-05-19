const path = require("path");
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

// Tắt Content-Security-Policy vì conflict với Swagger UI + inline scripts của frontend.
// Các header bảo vệ khác (HSTS, X-Frame-Options, ...) vẫn được helmet set.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// CORS — chỉ cần cho dev khi frontend chạy ở origin khác (Live Server, Postman, etc.)
// Khi frontend được serve từ `public/` cùng origin, browser không gửi preflight.
const allowedOrigins = CLIENT_URL.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
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

// Swagger UI (API docs)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Peak Auth API Docs",
    swaggerOptions: { persistAuthorization: true },
  })
);
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Frontend static — sau API để API route được match trước
// Truy cập http://localhost:3000/ sẽ tự load public/index.html
app.use(express.static(path.join(__dirname, "..", "public")));

// 404 cho mọi request còn lại (chỉ API endpoint không tồn tại; static file sẽ tự 404 từ express.static)
app.use((req, res) =>
  res.status(404).json({ message: "Không tìm thấy endpoint" })
);
app.use(errorHandler);

module.exports = app;

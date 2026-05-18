const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middlewares/errorHandler");
const { CLIENT_URL } = require("./config/env");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) =>
  res.status(404).json({ message: "Không tìm thấy endpoint" })
);
app.use(errorHandler);

module.exports = app;

require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  });
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

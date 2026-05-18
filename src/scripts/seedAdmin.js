// Cách dùng:
//   node src/scripts/seedAdmin.js <username>
// Ví dụ:
//   node src/scripts/seedAdmin.js vinh_test
//
// Script này nâng quyền 1 user có sẵn lên admin.
// Phải có sẵn 1 admin để promote người khác qua API, nên cần script này cho lần đầu.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { MONGODB_URI } = require("../config/env");

const run = async () => {
  const username = process.argv[2];
  if (!username) {
    console.error("❌ Thiếu tham số username. Vd: node src/scripts/seedAdmin.js vinh_test");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("✓ Đã kết nối MongoDB");

  const user = await User.findOneAndUpdate(
    { username },
    { role: "admin" },
    { returnDocument: "after" }
  );

  if (!user) {
    console.error(`❌ Không tìm thấy user '${username}'. Hãy đăng ký trước.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✓ Đã nâng quyền '${user.username}' lên role='${user.role}'`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Lỗi:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

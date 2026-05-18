// Jest setupFiles: chạy TRƯỚC khi test file được require.
// Cần set env vars ở đây vì src/config/env.js validate ngay khi import.
process.env.NODE_ENV = "test";
process.env.PORT = "0"; // không thực sự bind
process.env.MONGODB_URI = "mongodb://placeholder/test"; // bị override bởi memory server
process.env.JWT_ACCESS_SECRET = "test_access_secret_chi_dung_trong_test_aaa";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_chi_dung_trong_test_bbb";
process.env.CLIENT_URL = "http://localhost:5173";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

/**
 * Gắn lifecycle hooks vào test suite:
 * - beforeAll: khởi động Mongo in-memory + connect mongoose
 * - afterEach: xóa sạch mọi collection (test cô lập)
 * - afterAll: ngắt kết nối, tắt Mongo
 */
const setupTestDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 120000); // lần đầu mongodb-memory-server tải binary, có thể lâu

  afterEach(async () => {
    const { collections } = mongoose.connection;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });
};

module.exports = { setupTestDB };

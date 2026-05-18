const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const ADMIN = { username: "admin1", password: "password123" };
const NORMAL = { username: "user1", password: "password123" };

// Tạo user qua API rồi promote DIRECT trong DB (vì API không cho self-register admin)
const seedAdmin = async () => {
  await request(app).post("/api/auth/register").send(ADMIN);
  await User.updateOne({ username: ADMIN.username }, { role: "admin" });
};

const seedNormal = () => request(app).post("/api/auth/register").send(NORMAL);

const loginToken = async (creds) => {
  const res = await request(app).post("/api/auth/login").send(creds);
  return res.body.accessToken;
};

describe("GET /api/admin/users", () => {
  it("không có token → 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("user thường → 403", async () => {
    await seedNormal();
    const token = await loginToken(NORMAL);
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("admin → 200, trả danh sách user (không có password/refreshToken)", async () => {
    await seedAdmin();
    await seedNormal();
    const token = await loginToken(ADMIN);
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.users[0].password).toBeUndefined();
    expect(res.body.users[0].refreshToken).toBeUndefined();
  });
});

describe("PATCH /api/admin/users/:id/role", () => {
  let adminToken;
  let normalUserId;
  let adminUserId;

  beforeEach(async () => {
    await seedAdmin();
    await seedNormal();
    adminToken = await loginToken(ADMIN);

    const all = await User.find();
    normalUserId = all
      .find((u) => u.username === NORMAL.username)
      ._id.toString();
    adminUserId = all.find((u) => u.username === ADMIN.username)._id.toString();
  });

  it("đổi role hợp lệ → 200", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${normalUserId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });

  it("role không hợp lệ → 400", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${normalUserId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "superhacker" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/role/i);
  });

  it("admin tự hạ quyền mình → 400 (chống lockout)", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminUserId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "user" });
    expect(res.status).toBe(400);
  });

  it("ID sai format → 400 ID không hợp lệ", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/abc123/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "user" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ID không hợp lệ/);
  });

  it("ID đúng format nhưng không tồn tại → 404", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/000000000000000000000000/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "user" });
    expect(res.status).toBe(404);
  });

  it("user thường gọi PATCH → 403", async () => {
    const normalToken = await loginToken(NORMAL);
    const res = await request(app)
      .patch(`/api/admin/users/${normalUserId}/role`)
      .set("Authorization", `Bearer ${normalToken}`)
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });
});

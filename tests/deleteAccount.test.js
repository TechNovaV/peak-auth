const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "del_user",
  password: "password123",
  email: "del@test.com",
};

const seedAndLogin = async () => {
  await request(app).post("/api/auth/register").send(USER);
  const loginRes = await request(app).post("/api/auth/login").send({
    username: USER.username,
    password: USER.password,
  });
  return {
    accessToken: loginRes.body.accessToken,
    refreshCookie: loginRes.headers["set-cookie"].find((c) =>
      c.startsWith("refreshToken=")
    ),
  };
};

const deleteAccount = (token, body) =>
  request(app)
    .delete("/api/auth/account")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

describe("DELETE /api/auth/account", () => {
  describe("Authentication", () => {
    it("không có Bearer → 401", async () => {
      const res = await request(app)
        .delete("/api/auth/account")
        .send({ password: "password123" });
      expect(res.status).toBe(401);
    });

    it("Bearer token rác → 403", async () => {
      const res = await request(app)
        .delete("/api/auth/account")
        .set("Authorization", "Bearer fake_token")
        .send({ password: "password123" });
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("thiếu password → 400", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await deleteAccount(accessToken, {});
      expect(res.status).toBe(400);
    });

    it("sai password → 401", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await deleteAccount(accessToken, { password: "wrong" });
      expect(res.status).toBe(401);
    });
  });

  describe("Happy path", () => {
    it("đúng password → 200, user bị xóa khỏi DB", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await deleteAccount(accessToken, { password: USER.password });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/xóa|thành công/i);

      const dbUser = await User.findOne({ username: USER.username });
      expect(dbUser).toBeNull();
    });

    it("sau khi xóa, login bằng credential cũ → 401", async () => {
      const { accessToken } = await seedAndLogin();
      await deleteAccount(accessToken, { password: USER.password });

      const loginRes = await request(app).post("/api/auth/login").send({
        username: USER.username,
        password: USER.password,
      });
      expect(loginRes.status).toBe(401);
    });

    it("sau khi xóa, /me với access token cũ → 404", async () => {
      const { accessToken } = await seedAndLogin();
      await deleteAccount(accessToken, { password: USER.password });

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);
      expect(meRes.status).toBe(404);
    });

    it("sau khi xóa, refresh token cũ → 403", async () => {
      const { accessToken, refreshCookie } = await seedAndLogin();
      await deleteAccount(accessToken, { password: USER.password });

      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie);
      expect(refreshRes.status).toBe(403);
    });

    it("response clear cookie refreshToken", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await deleteAccount(accessToken, { password: USER.password });
      const setCookie = (res.headers["set-cookie"] || []).join(";");
      expect(setCookie).toMatch(/refreshToken=;/);
    });
  });
});

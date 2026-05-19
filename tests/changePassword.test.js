const request = require("supertest");
const app = require("../src/app");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "cp_user",
  password: "oldpass123",
  email: "cp@test.com",
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

const changePassword = (token, body) =>
  request(app)
    .post("/api/auth/change-password")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

describe("POST /api/auth/change-password", () => {
  describe("Validation", () => {
    it("không có Bearer token → 401", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({ currentPassword: "oldpass123", newPassword: "newpass456" });
      expect(res.status).toBe(401);
    });

    it("thiếu currentPassword → 400", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        newPassword: "newpass456",
      });
      expect(res.status).toBe(400);
    });

    it("thiếu newPassword → 400", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        currentPassword: "oldpass123",
      });
      expect(res.status).toBe(400);
    });

    it("newPassword < 8 ký tự → 400", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "short",
      });
      expect(res.status).toBe(400);
    });

    it("newPassword === currentPassword → 400 (không cho password trùng cũ)", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "oldpass123",
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/khác|cũ/i);
    });
  });

  describe("Authentication", () => {
    it("sai currentPassword → 401", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        currentPassword: "wrong_password",
        newPassword: "newpass456",
      });
      expect(res.status).toBe(401);
    });

    it("Bearer token rác → 403", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", "Bearer not_a_real_jwt")
        .send({ currentPassword: "oldpass123", newPassword: "newpass456" });
      expect(res.status).toBe(403);
    });
  });

  describe("Happy path", () => {
    it("đúng currentPassword + newPassword hợp lệ → 200", async () => {
      const { accessToken } = await seedAndLogin();
      const res = await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/i);
    });

    it("sau khi đổi, login bằng password CŨ phải 401", async () => {
      const { accessToken } = await seedAndLogin();
      await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });

      const loginOld = await request(app)
        .post("/api/auth/login")
        .send({ username: USER.username, password: "oldpass123" });
      expect(loginOld.status).toBe(401);
    });

    it("sau khi đổi, login bằng password MỚI phải 200", async () => {
      const { accessToken } = await seedAndLogin();
      await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });

      const loginNew = await request(app)
        .post("/api/auth/login")
        .send({ username: USER.username, password: "newpass456" });
      expect(loginNew.status).toBe(200);
      expect(loginNew.body.accessToken).toBeDefined();
    });

    it("refresh token cũ bị revoke (logout mọi session)", async () => {
      const { accessToken, refreshCookie } = await seedAndLogin();
      await changePassword(accessToken, {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });

      // Dùng lại refresh cookie cũ → DB không khớp nữa → 403
      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie);
      expect(refreshRes.status).toBe(403);
    });
  });
});

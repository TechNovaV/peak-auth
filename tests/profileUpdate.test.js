const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "pu_user",
  password: "password123",
  email: "pu@test.com",
};

const seedAndLogin = async () => {
  const reg = await request(app).post("/api/auth/register").send(USER);
  // Verify user trước (để test thấy isVerified bị reset khi đổi email)
  await request(app)
    .post("/api/auth/verify-email")
    .send({ token: reg.body.verifyToken });

  const loginRes = await request(app).post("/api/auth/login").send({
    username: USER.username,
    password: USER.password,
  });
  return loginRes.body.accessToken;
};

const updateProfile = (token, body) =>
  request(app)
    .patch("/api/auth/profile")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

describe("PATCH /api/auth/profile", () => {
  describe("Authentication", () => {
    it("không có Bearer → 401", async () => {
      const res = await request(app)
        .patch("/api/auth/profile")
        .send({ username: "new_name" });
      expect(res.status).toBe(401);
    });
  });

  describe("Validation", () => {
    it("body rỗng → 400", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, {});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ít nhất|username|email/i);
    });

    it("username < 3 ký tự → 400", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { username: "ab" });
      expect(res.status).toBe(400);
    });

    it("email sai format → 400", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { email: "khong-phai-email" });
      expect(res.status).toBe(400);
    });

    it("username trùng (user khác đã dùng) → 409", async () => {
      // Tạo user khác
      await request(app).post("/api/auth/register").send({
        username: "taken_name",
        password: "password123",
      });

      const token = await seedAndLogin();
      const res = await updateProfile(token, { username: "taken_name" });
      expect(res.status).toBe(409);
    });

    it("email trùng → 409", async () => {
      await request(app).post("/api/auth/register").send({
        username: "other",
        password: "password123",
        email: "taken@test.com",
      });

      const token = await seedAndLogin();
      const res = await updateProfile(token, { email: "taken@test.com" });
      expect(res.status).toBe(409);
    });
  });

  describe("Happy path", () => {
    it("đổi username thành công → 200", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { username: "new_username" });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("new_username");
      expect(res.body.user.email).toBe(USER.email);
    });

    it("đổi email thành công → 200, isVerified reset về false", async () => {
      const token = await seedAndLogin();
      // Verify isVerified ban đầu là true (đã verify trong seedAndLogin)
      const meBefore = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(meBefore.body.user.isVerified).toBe(true);

      const res = await updateProfile(token, { email: "new@test.com" });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("new@test.com");
      expect(res.body.user.isVerified).toBe(false);
      // Trả verifyToken mới trong dev/test
      expect(res.body.verifyToken).toEqual(expect.any(String));
    });

    it("đổi cả username + email cùng lúc → 200", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, {
        username: "both_new",
        email: "both@test.com",
      });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("both_new");
      expect(res.body.user.email).toBe("both@test.com");
    });

    it("đổi email thành CHÍNH email cũ → no-op, isVerified vẫn true", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { email: USER.email });
      expect(res.status).toBe(200);
      expect(res.body.user.isVerified).toBe(true);
      // Không trả verifyToken vì không đổi
      expect(res.body.verifyToken).toBeUndefined();
    });

    it("đổi username thành CHÍNH username cũ → 200 no-op", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { username: USER.username });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe(USER.username);
    });
  });

  describe("Security", () => {
    it("response không chứa password / refreshToken / verifyToken hash", async () => {
      const token = await seedAndLogin();
      const res = await updateProfile(token, { username: "secure_user" });
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.user.emailVerificationToken).toBeUndefined();
    });

    it("DB thật sự được cập nhật", async () => {
      const token = await seedAndLogin();
      await updateProfile(token, { username: "db_check_user" });

      const dbUser = await User.findOne({ username: "db_check_user" });
      expect(dbUser).not.toBeNull();
    });
  });
});

const request = require("supertest");
const app = require("../src/app");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "verify_user",
  password: "password123",
  email: "verify@test.com",
};

const seedUser = () =>
  request(app).post("/api/auth/register").send(USER);

const verifyEmail = (token) =>
  request(app).post("/api/auth/verify-email").send({ token });

const resend = (body) =>
  request(app).post("/api/auth/resend-verification").send(body);

describe("POST /api/auth/register (gắn email verification)", () => {
  it("đăng ký có email → trả verifyToken trong response (test env)", async () => {
    const res = await seedUser();
    expect(res.status).toBe(201);
    expect(res.body.verifyToken).toEqual(expect.any(String));
    expect(res.body.note).toMatch(/xác minh/i);
  });

  it("đăng ký không có email → KHÔNG có verifyToken", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "no_email", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.verifyToken).toBeUndefined();
  });
});

describe("POST /api/auth/verify-email", () => {
  let token;
  beforeEach(async () => {
    const r = await seedUser();
    token = r.body.verifyToken;
  });

  it("token đúng → 200, /me trả isVerified=true", async () => {
    const verifyRes = await verifyEmail(token);
    expect(verifyRes.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: USER.username, password: USER.password });

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.body.user.isVerified).toBe(true);
  });

  it("trước khi verify, /me trả isVerified=false", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: USER.username, password: USER.password });

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.body.user.isVerified).toBe(false);
  });

  it("reuse token đã dùng → 400 (single-use)", async () => {
    await verifyEmail(token);
    const res = await verifyEmail(token);
    expect(res.status).toBe(400);
  });

  it("token sai → 400", async () => {
    const res = await verifyEmail("token_gia");
    expect(res.status).toBe(400);
  });

  it("thiếu token → 400", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/resend-verification", () => {
  beforeEach(seedUser);

  it("email pending verify → 200 + verifyToken mới, vô hiệu hóa token cũ", async () => {
    const firstRes = await seedUser(); // user đã có sẵn từ beforeEach, lần này lỗi 409
    // Lấy verify token lần đầu từ user đã có
    // Vì seedUser ở beforeEach đã trả token, nhưng chúng ta không lưu — gọi resend
    const resendRes = await resend({ email: USER.email });
    expect(resendRes.status).toBe(200);
    expect(resendRes.body.verifyToken).toEqual(expect.any(String));
  });

  it("email không tồn tại → 200 generic, KHÔNG có token (anti-enumeration)", async () => {
    const res = await resend({ email: "ghost@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.verifyToken).toBeUndefined();
  });

  it("user đã verify rồi → 200 generic, KHÔNG có token", async () => {
    // Verify trước
    const r = await request(app)
      .post("/api/auth/register")
      .send({
        username: "already_verified",
        password: "password123",
        email: "av@test.com",
      });
    await verifyEmail(r.body.verifyToken);

    const res = await resend({ email: "av@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.verifyToken).toBeUndefined();
  });

  it("email sai định dạng → 400", async () => {
    const res = await resend({ email: "khong-phai-email" });
    expect(res.status).toBe(400);
  });

  it("thiếu email → 400", async () => {
    const res = await resend({});
    expect(res.status).toBe(400);
  });

  it("token cũ bị vô hiệu khi resend → token mới mới verify được", async () => {
    // Register user fresh
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        username: "rotation_user",
        password: "password123",
        email: "rot@test.com",
      });
    const oldToken = reg.body.verifyToken;

    // Resend → token mới
    const resendRes = await resend({ email: "rot@test.com" });
    const newToken = resendRes.body.verifyToken;
    expect(newToken).not.toBe(oldToken);

    // Token cũ KHÔNG dùng được
    const oldRes = await verifyEmail(oldToken);
    expect(oldRes.status).toBe(400);

    // Token mới OK
    const newRes = await verifyEmail(newToken);
    expect(newRes.status).toBe(200);
  });
});

const request = require("supertest");
const app = require("../src/app");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const VALID_USER = {
  username: "alice",
  password: "password123",
  email: "alice@test.com",
};

const register = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({ ...VALID_USER, ...overrides });

const login = (creds = VALID_USER) =>
  request(app).post("/api/auth/login").send({
    username: creds.username,
    password: creds.password,
  });

describe("POST /api/auth/register", () => {
  it("đăng ký thành công → 201", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/thành công/i);
  });

  it("trùng username → 409", async () => {
    await register();
    const res = await register({ email: "another@test.com" });
    expect(res.status).toBe(409);
  });

  it("trùng email → 409", async () => {
    await register();
    const res = await register({ username: "bob" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it("username quá ngắn → 400", async () => {
    const res = await register({ username: "ab" });
    expect(res.status).toBe(400);
  });

  it("password quá ngắn → 400", async () => {
    const res = await register({ password: "123" });
    expect(res.status).toBe(400);
  });

  it("email sai định dạng → 400", async () => {
    const res = await register({ email: "khong-phai-email" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it("đăng ký không có email vẫn OK (email là optional)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "no_email_user", password: "password123" });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await register();
  });

  it("login đúng → 200 + accessToken + Set-Cookie refreshToken", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    const setCookie = res.headers["set-cookie"]?.join(";") || "";
    expect(setCookie).toMatch(/refreshToken=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });

  it("sai password → 401", async () => {
    const res = await login({ ...VALID_USER, password: "wrong_password" });
    expect(res.status).toBe(401);
  });

  it("user không tồn tại → 401 (cùng message, anti-enumeration)", async () => {
    const res = await login({ username: "ghost", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("username quá ngắn → 400 (validation)", async () => {
    const res = await login({ username: "x", password: "password123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/refresh", () => {
  let agent;
  beforeEach(async () => {
    await register();
    agent = request.agent(app); // giữ cookie tự động
    await agent.post("/api/auth/login").send({
      username: VALID_USER.username,
      password: VALID_USER.password,
    });
  });

  it("có cookie refresh → 200 + accessToken mới", async () => {
    const res = await agent.post("/api/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("không có cookie → 401", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("cookie rác → 403", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", ["refreshToken=khong_phai_jwt_hop_le"]);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/logout", () => {
  it("không có cookie → 204", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  it("có cookie → 200, sau đó refresh bằng CHÍNH cookie cũ bị 403 (token đã revoke trong DB)", async () => {
    await register();

    // Lấy cookie từ login response
    const loginRes = await request(app).post("/api/auth/login").send({
      username: VALID_USER.username,
      password: VALID_USER.password,
    });
    const refreshCookie = loginRes.headers["set-cookie"].find((c) =>
      c.startsWith("refreshToken=")
    );

    // Logout — server clear cookie + xóa refreshToken trong DB
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", refreshCookie);
    expect(logoutRes.status).toBe(200);

    // Dùng lại cookie cũ → DB không khớp nữa → 403
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie);
    expect(refreshRes.status).toBe(403);
  });
});

describe("GET /api/auth/me", () => {
  let token;
  beforeEach(async () => {
    await register();
    const res = await login();
    token = res.body.accessToken;
  });

  it("có Bearer token → 200, trả user, KHÔNG có password/refreshToken/tokens", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(VALID_USER.username);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.refreshToken).toBeUndefined();
    expect(res.body.user.resetPasswordToken).toBeUndefined();
    expect(res.body.user.emailVerificationToken).toBeUndefined();
  });

  it("không có token → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("token rác → 403", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not_a_real_jwt");
    expect(res.status).toBe(403);
  });
});

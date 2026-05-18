const request = require("supertest");
const app = require("../src/app");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "fp_user",
  password: "oldpassword1",
  email: "fp@test.com",
};

const seedUser = () => request(app).post("/api/auth/register").send(USER);

const forgot = (body) =>
  request(app).post("/api/auth/forgot-password").send(body);

const reset = (body) =>
  request(app).post("/api/auth/reset-password").send(body);

describe("POST /api/auth/forgot-password", () => {
  beforeEach(seedUser);

  it("bằng username → 200 + resetToken (test env)", async () => {
    const res = await forgot({ username: USER.username });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Nếu tài khoản/);
    expect(res.body.resetToken).toEqual(expect.any(String));
  });

  it("bằng email → 200 + resetToken", async () => {
    const res = await forgot({ email: USER.email });
    expect(res.status).toBe(200);
    expect(res.body.resetToken).toEqual(expect.any(String));
  });

  it("user KHÔNG tồn tại → 200 generic, KHÔNG có resetToken (anti-enumeration)", async () => {
    const res = await forgot({ username: "ghost_user" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Nếu tài khoản/);
    expect(res.body.resetToken).toBeUndefined();
  });

  it("body rỗng → 400", async () => {
    const res = await forgot({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/reset-password", () => {
  let token;
  beforeEach(async () => {
    await seedUser();
    const r = await forgot({ username: USER.username });
    token = r.body.resetToken;
  });

  it("token đúng + password hợp lệ → 200, login bằng password mới OK", async () => {
    const res = await reset({ token, password: "newpassword99" });
    expect(res.status).toBe(200);

    // Password cũ không còn dùng được
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: USER.username, password: USER.password });
    expect(oldLogin.status).toBe(401);

    // Password mới hoạt động
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: USER.username, password: "newpassword99" });
    expect(newLogin.status).toBe(200);
  });

  it("reuse token đã dùng → 400 (single-use)", async () => {
    await reset({ token, password: "newpassword99" });
    const res = await reset({ token, password: "hacker_pass1" });
    expect(res.status).toBe(400);
  });

  it("token sai → 400", async () => {
    const res = await reset({ token: "token_gia", password: "newpassword99" });
    expect(res.status).toBe(400);
  });

  it("thiếu token → 400", async () => {
    const res = await reset({ password: "newpassword99" });
    expect(res.status).toBe(400);
  });

  it("password yếu → 400", async () => {
    const res = await reset({ token, password: "123" });
    expect(res.status).toBe(400);
  });

  it("reset xong, refresh token cũ bị revoke (kick session)", async () => {
    // Login trước → có refresh cookie
    const loginRes = await request(app).post("/api/auth/login").send({
      username: USER.username,
      password: USER.password,
    });
    const refreshCookie = loginRes.headers["set-cookie"].find((c) =>
      c.startsWith("refreshToken=")
    );

    // Reset password
    await reset({ token, password: "newpassword99" });

    // Refresh token cũ phải không dùng được nữa
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie);
    expect(refreshRes.status).toBe(403);
  });
});

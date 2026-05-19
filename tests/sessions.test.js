const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER = {
  username: "sess_user",
  password: "password123",
  email: "sess@test.com",
};

const seedUser = () => request(app).post("/api/auth/register").send(USER);

const loginWithUA = (ua) =>
  request(app)
    .post("/api/auth/login")
    .set("User-Agent", ua)
    .send({ username: USER.username, password: USER.password });

const listSessions = (token) =>
  request(app)
    .get("/api/auth/sessions")
    .set("Authorization", `Bearer ${token}`);

const revokeSession = (token, sessionId) =>
  request(app)
    .delete(`/api/auth/sessions/${sessionId}`)
    .set("Authorization", `Bearer ${token}`);

describe("Multi-session support", () => {
  describe("Login từ nhiều thiết bị → có nhiều session", () => {
    it("login 3 lần → có 3 session trong DB", async () => {
      await seedUser();
      await loginWithUA("Chrome/Windows");
      await loginWithUA("Safari/iOS");
      await loginWithUA("Firefox/Linux");

      const user = await User.findOne({ username: USER.username });
      expect(user.sessions.length).toBe(3);
    });

    it("mỗi session có userAgent + ip + createdAt + lastUsed", async () => {
      await seedUser();
      await loginWithUA("Chrome/Windows");

      const user = await User.findOne({ username: USER.username });
      const s = user.sessions[0];
      expect(s.userAgent).toMatch(/Chrome/);
      expect(s.ip).toBeDefined();
      expect(s.createdAt).toBeInstanceOf(Date);
      expect(s.lastUsed).toBeInstanceOf(Date);
      // Token được hash, không lưu raw
      expect(s.tokenHash).toBeDefined();
    });
  });

  describe("GET /api/auth/sessions", () => {
    it("không có Bearer → 401", async () => {
      const res = await request(app).get("/api/auth/sessions");
      expect(res.status).toBe(401);
    });

    it("trả list session của user hiện tại, KHÔNG có tokenHash", async () => {
      await seedUser();
      await loginWithUA("Chrome/Windows");
      const r2 = await loginWithUA("Safari/iOS");

      const res = await listSessions(r2.body.accessToken);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(2);
      expect(res.body.sessions[0].tokenHash).toBeUndefined();
      expect(res.body.sessions[0].userAgent).toBeDefined();
    });

    it("đánh dấu session HIỆN TẠI bằng field 'current: true'", async () => {
      await seedUser();
      await loginWithUA("Chrome/Windows");
      const r2 = await loginWithUA("Safari/iOS");

      const res = await listSessions(r2.body.accessToken);
      const currentSessions = res.body.sessions.filter((s) => s.current);
      expect(currentSessions).toHaveLength(1);
      expect(currentSessions[0].userAgent).toMatch(/Safari/);
    });
  });

  describe("DELETE /api/auth/sessions/:id (revoke 1 session)", () => {
    it("revoke session khác → 200, session đó biến mất khỏi DB", async () => {
      await seedUser();
      const r1 = await loginWithUA("Chrome/Windows");
      const r2 = await loginWithUA("Safari/iOS");

      // Token r2 dùng để gọi API, revoke session của r1
      const list = await listSessions(r2.body.accessToken);
      const r1Session = list.body.sessions.find((s) =>
        s.userAgent.match(/Chrome/)
      );

      const res = await revokeSession(r2.body.accessToken, r1Session._id);
      expect(res.status).toBe(200);

      const user = await User.findOne({ username: USER.username });
      expect(user.sessions.length).toBe(1);
      expect(user.sessions[0].userAgent).toMatch(/Safari/);
    });

    it("session ID không tồn tại → 404", async () => {
      await seedUser();
      const r = await loginWithUA("Chrome");
      const res = await revokeSession(
        r.body.accessToken,
        "000000000000000000000000"
      );
      expect(res.status).toBe(404);
    });

    it("session ID sai format → 400", async () => {
      await seedUser();
      const r = await loginWithUA("Chrome");
      const res = await revokeSession(r.body.accessToken, "not_an_objectid");
      expect(res.status).toBe(400);
    });

    it("revoke chính session mình → cookie hiện tại không refresh được", async () => {
      await seedUser();
      const r = await loginWithUA("Chrome");
      const refreshCookie = r.headers["set-cookie"].find((c) =>
        c.startsWith("refreshToken=")
      );

      const list = await listSessions(r.body.accessToken);
      const myId = list.body.sessions.find((s) => s.current)._id;

      await revokeSession(r.body.accessToken, myId);

      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie);
      expect(refreshRes.status).toBe(403);
    });
  });

  describe("Backward compat với các endpoint cũ", () => {
    it("logout chỉ xóa session HIỆN TẠI, session khác vẫn còn", async () => {
      await seedUser();
      const r1 = await loginWithUA("Chrome");
      const r2 = await loginWithUA("Safari");

      const r2Cookie = r2.headers["set-cookie"].find((c) =>
        c.startsWith("refreshToken=")
      );
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", r2Cookie);
      expect(logoutRes.status).toBe(200);

      const user = await User.findOne({ username: USER.username });
      expect(user.sessions.length).toBe(1); // r1 còn
      expect(user.sessions[0].userAgent).toMatch(/Chrome/);

      // r1 cookie vẫn refresh được
      const r1Cookie = r1.headers["set-cookie"].find((c) =>
        c.startsWith("refreshToken=")
      );
      const refreshR1 = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", r1Cookie);
      expect(refreshR1.status).toBe(200);
    });

    it("reset password → tất cả session bị xóa", async () => {
      await seedUser();
      await loginWithUA("Chrome");
      await loginWithUA("Safari");

      const forgot = await request(app)
        .post("/api/auth/forgot-password")
        .send({ username: USER.username });

      await request(app).post("/api/auth/reset-password").send({
        token: forgot.body.resetToken,
        password: "newpass456",
      });

      const user = await User.findOne({ username: USER.username });
      expect(user.sessions.length).toBe(0);
    });

    it("change password → tất cả session bị xóa", async () => {
      await seedUser();
      const r1 = await loginWithUA("Chrome");
      await loginWithUA("Safari");

      await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${r1.body.accessToken}`)
        .send({
          currentPassword: USER.password,
          newPassword: "newpass456",
        });

      const user = await User.findOne({ username: USER.username });
      expect(user.sessions.length).toBe(0);
    });

    it("delete account → user và sessions đều xóa", async () => {
      await seedUser();
      const r = await loginWithUA("Chrome");
      await loginWithUA("Safari");

      await request(app)
        .delete("/api/auth/account")
        .set("Authorization", `Bearer ${r.body.accessToken}`)
        .send({ password: USER.password });

      const user = await User.findOne({ username: USER.username });
      expect(user).toBeNull();
    });
  });
});

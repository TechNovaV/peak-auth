const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { setupTestDB } = require("./helpers/db");
const { AVATAR_DIR } = require("../src/middlewares/upload");

setupTestDB();

const USER = {
  username: "av_user",
  password: "password123",
  email: "av@test.com",
};

const seedAndLogin = async () => {
  await request(app).post("/api/auth/register").send(USER);
  const login = await request(app).post("/api/auth/login").send({
    email: USER.email,
    password: USER.password,
  });
  return login.body.accessToken;
};

// PNG 1x1 pixel hợp lệ (8 bytes signature + minimal chunks)
const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6300010000000500010DCB6C2B0000000049454E44AE426082",
  "hex"
);

// File quá lớn (>2MB)
const LARGE_BUFFER = Buffer.alloc(3 * 1024 * 1024, 0);

describe("POST /api/auth/avatar", () => {
  // Cleanup files giữa các test
  afterEach(() => {
    if (fs.existsSync(AVATAR_DIR)) {
      fs.readdirSync(AVATAR_DIR).forEach((f) => {
        try {
          fs.unlinkSync(path.join(AVATAR_DIR, f));
        } catch (_e) {
          /* ignore */
        }
      });
    }
  });

  it("không có Bearer → 401", async () => {
    const res = await request(app)
      .post("/api/auth/avatar")
      .attach("avatar", TINY_PNG, {
        filename: "test.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(401);
  });

  it("không có file → 400", async () => {
    const token = await seedAndLogin();
    const res = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("file quá lớn (>2MB) → 400", async () => {
    const token = await seedAndLogin();
    const res = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", LARGE_BUFFER, {
        filename: "huge.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/2MB|lớn/i);
  });

  it("mime type sai (text/plain) → 400", async () => {
    const token = await seedAndLogin();
    const res = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", Buffer.from("not an image"), {
        filename: "fake.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPG|PNG|WebP/i);
  });

  it("upload PNG hợp lệ → 200, file tồn tại, user.avatarUrl được set", async () => {
    const token = await seedAndLogin();
    const res = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", TINY_PNG, {
        filename: "me.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.png$/);

    const user = await User.findOne({ username: USER.username });
    expect(user.avatarUrl).toBe(res.body.avatarUrl);

    // File thật tồn tại trên disk
    const filename = path.basename(res.body.avatarUrl);
    expect(fs.existsSync(path.join(AVATAR_DIR, filename))).toBe(true);
  });

  it("upload lần 2 → file cũ bị xóa, file mới được tạo", async () => {
    const token = await seedAndLogin();

    const r1 = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", TINY_PNG, {
        filename: "a.png",
        contentType: "image/png",
      });

    const oldFilename = path.basename(r1.body.avatarUrl);

    const r2 = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", TINY_PNG, {
        filename: "b.png",
        contentType: "image/png",
      });

    expect(r2.status).toBe(200);
    expect(r2.body.avatarUrl).not.toBe(r1.body.avatarUrl);

    // Đợi 1 chút cho fs.unlink chạy xong (async)
    await new Promise((r) => setTimeout(r, 100));

    expect(fs.existsSync(path.join(AVATAR_DIR, oldFilename))).toBe(false);
    expect(
      fs.existsSync(path.join(AVATAR_DIR, path.basename(r2.body.avatarUrl)))
    ).toBe(true);
  });

  it("/me trả avatarUrl", async () => {
    const token = await seedAndLogin();
    await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", TINY_PNG, {
        filename: "x.png",
        contentType: "image/png",
      });

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.body.user.avatarUrl).toMatch(/^\/uploads\/avatars\//);
  });
});

describe("DELETE /api/auth/avatar", () => {
  it("không có Bearer → 401", async () => {
    const res = await request(app).delete("/api/auth/avatar");
    expect(res.status).toBe(401);
  });

  it("user chưa có avatar → vẫn 200 (idempotent)", async () => {
    const token = await seedAndLogin();
    const res = await request(app)
      .delete("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("delete sau khi upload → user.avatarUrl rỗng, file disk bị xóa", async () => {
    const token = await seedAndLogin();
    const up = await request(app)
      .post("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", TINY_PNG, {
        filename: "delme.png",
        contentType: "image/png",
      });
    const filename = path.basename(up.body.avatarUrl);

    const del = await request(app)
      .delete("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));
    expect(fs.existsSync(path.join(AVATAR_DIR, filename))).toBe(false);

    const user = await User.findOne({ username: USER.username });
    expect(user.avatarUrl).toBe("");
  });
});

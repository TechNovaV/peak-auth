const request = require("supertest");
const app = require("../src/app");
const { setupTestDB } = require("./helpers/db");

setupTestDB();

const USER_A = {
  username: "alice",
  password: "password123",
  email: "alice@test.com",
  fullName: "Alice",
};
const USER_B = {
  username: "bob",
  password: "password123",
  email: "bob@test.com",
  fullName: "Bob",
};

const registerAndLogin = async (user) => {
  await request(app).post("/api/auth/register").send(user);
  const login = await request(app).post("/api/auth/login").send({
    email: user.email,
    password: user.password,
  });
  return login.body.accessToken;
};

describe("POST /api/posts (create)", () => {
  it("không có Bearer → 401", async () => {
    const res = await request(app)
      .post("/api/posts")
      .send({ content: "hello" });
    expect(res.status).toBe(401);
  });

  it("thiếu content → 400", async () => {
    const token = await registerAndLogin(USER_A);
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("content rỗng → 400", async () => {
    const token = await registerAndLogin(USER_A);
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("content > 1000 ký tự → 400", async () => {
    const token = await registerAndLogin(USER_A);
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "a".repeat(1001) });
    expect(res.status).toBe(400);
  });

  it("content hợp lệ → 201, post trả về có author populated", async () => {
    const token = await registerAndLogin(USER_A);
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Hello world" });
    expect(res.status).toBe(201);
    expect(res.body.post.content).toBe("Hello world");
    expect(res.body.post.author.username).toBe("alice");
    expect(res.body.post.author.password).toBeUndefined();
    expect(res.body.post.likes).toEqual([]);
    expect(res.body.post.likeCount).toBe(0);
  });
});

describe("GET /api/posts (feed)", () => {
  it("không có Bearer → 401", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.status).toBe(401);
  });

  it("trả list posts theo thời gian giảm dần", async () => {
    const tokenA = await registerAndLogin(USER_A);
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "First post" });
    await new Promise((r) => setTimeout(r, 20));
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Second post" });

    const res = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts[0].content).toBe("Second post"); // newest first
    expect(res.body.posts[1].content).toBe("First post");
  });

  it("mỗi post có likeCount + likedByMe", async () => {
    const tokenA = await registerAndLogin(USER_A);
    const tokenB = await registerAndLogin(USER_B);

    const createRes = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Like me" });
    const postId = createRes.body.post._id;

    // B like post của A
    await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenB}`);

    // A xem feed → likeCount=1, likedByMe=false
    const feedA = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(feedA.body.posts[0].likeCount).toBe(1);
    expect(feedA.body.posts[0].likedByMe).toBe(false);

    // B xem feed → likedByMe=true
    const feedB = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(feedB.body.posts[0].likedByMe).toBe(true);
  });
});

describe("DELETE /api/posts/:id", () => {
  let postId, tokenA;

  beforeEach(async () => {
    tokenA = await registerAndLogin(USER_A);
    const r = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Delete me" });
    postId = r.body.post._id;
  });

  it("chính chủ xóa → 200, post biến mất", async () => {
    const del = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(del.status).toBe(200);

    const feed = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(feed.body.posts).toHaveLength(0);
  });

  it("user khác xóa → 403", async () => {
    const tokenB = await registerAndLogin(USER_B);
    const del = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(del.status).toBe(403);
  });

  it("admin xóa post của user khác → 200", async () => {
    const tokenB = await registerAndLogin(USER_B);
    // Promote B thành admin trực tiếp trong DB
    const User = require("../src/models/User");
    await User.updateOne({ username: "bob" }, { role: "admin" });
    // B phải re-login để JWT mới chứa role=admin
    const adminLogin = await request(app).post("/api/auth/login").send({
      email: USER_B.email,
      password: USER_B.password,
    });
    const adminToken = adminLogin.body.accessToken;

    const del = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it("post không tồn tại → 404", async () => {
    const del = await request(app)
      .delete(`/api/posts/000000000000000000000000`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(del.status).toBe(404);
  });

  it("ID sai format → 400", async () => {
    const del = await request(app)
      .delete(`/api/posts/not_an_id`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(del.status).toBe(400);
  });
});

describe("POST /api/posts/:id/like (toggle)", () => {
  let postId, tokenA, tokenB;

  beforeEach(async () => {
    tokenA = await registerAndLogin(USER_A);
    tokenB = await registerAndLogin(USER_B);
    const r = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Vote for me" });
    postId = r.body.post._id;
  });

  it("like lần đầu → 200, liked=true, count=1", async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
    expect(res.body.likeCount).toBe(1);
  });

  it("like lần 2 cùng user → unlike (toggle), count=0", async () => {
    await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenB}`);
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.liked).toBe(false);
    expect(res.body.likeCount).toBe(0);
  });

  it("nhiều user like → count tăng theo", async () => {
    await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenA}`);
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.likeCount).toBe(2);
  });
});

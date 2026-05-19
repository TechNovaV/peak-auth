const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Peak Auth API",
      version: "1.0.0",
      description:
        "Auth API với JWT access + refresh token, RBAC, email verification, password reset.\n\n" +
        "**Bảo mật:**\n" +
        "- Access token (15 phút) trong header `Authorization: Bearer <token>`\n" +
        "- Refresh token (7 ngày) trong HttpOnly cookie, tự động gửi bởi browser\n" +
        "- Reset/verify token sinh sau 1 lần dùng, lưu SHA-256 hash trong DB",
      contact: {
        name: "GitHub Repo",
        url: "https://github.com/TechNovaV/peak-auth",
      },
      license: {
        name: "MIT",
        url: "https://github.com/TechNovaV/peak-auth/blob/main/LICENSE",
      },
    },
    servers: [
      { url: "http://localhost:3000", description: "Local dev" },
      {
        url: "https://peak-auth.onrender.com",
        description: "Production (Render)",
      },
    ],
    tags: [
      { name: "Auth", description: "Đăng ký, đăng nhập, refresh, logout" },
      { name: "Password", description: "Forgot/reset password" },
      { name: "Email", description: "Verify email, resend verification" },
      { name: "User", description: "Thông tin user hiện tại" },
      { name: "Admin", description: "Quản trị (yêu cầu role=admin)" },
      { name: "Posts", description: "Đăng bài, feed, like" },
      { name: "System", description: "Health check" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token nhận được từ POST /api/auth/login. Dán vào ô bên dưới (KHÔNG cần prefix 'Bearer ').",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description: "Refresh token tự động lưu trong cookie sau khi login",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6a0b3cb3de26ba7b0bb17c50" },
            username: { type: "string", example: "alice" },
            email: {
              type: "string",
              nullable: true,
              example: "alice@test.com",
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              example: "user",
            },
            isVerified: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Sai tài khoản hoặc mật khẩu",
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 3, example: "alice" },
            password: { type: "string", minLength: 8, example: "password123" },
            email: {
              type: "string",
              format: "email",
              nullable: true,
              example: "alice@test.com",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "alice" },
            password: { type: "string", example: "password123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Đăng nhập thành công" },
            accessToken: {
              type: "string",
              description:
                "JWT access token (15 phút). Refresh token được set tự động trong HttpOnly cookie.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          description: "Cần ít nhất 1 trong 2: username hoặc email",
          properties: {
            username: { type: "string", example: "alice" },
            email: {
              type: "string",
              format: "email",
              example: "alice@test.com",
            },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: {
              type: "string",
              description: "Reset token nhận từ email",
              example: "bdc5cbdc68a650ff25db083ee4de6c33d997b5f8...",
            },
            password: {
              type: "string",
              minLength: 8,
              example: "newpassword99",
            },
          },
        },
        VerifyEmailRequest: {
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string", example: "6253c275eb0ebc63b8107096..." },
          },
        },
        ResendVerificationRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "alice@test.com",
            },
          },
        },
        UpdateRoleRequest: {
          type: "object",
          required: ["role"],
          properties: {
            role: { type: "string", enum: ["user", "admin"], example: "admin" },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Unauthorized: {
          description: "Chưa đăng nhập hoặc token không có",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Không đủ quyền",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Không tìm thấy resource",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Conflict: {
          description: "Resource đã tồn tại",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        TooManyRequests: {
          description: "Vượt rate limit (5 req / 15 phút)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  // Quét JSDoc trong các file route + app.js (chứa /health)
  apis: ["./src/routes/*.js", "./src/app.js", "./src/routes/post.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

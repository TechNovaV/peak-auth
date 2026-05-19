const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimiter");

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản mới
 *     description: |
 *       Tạo user mới. Nếu có email, sinh verify token + gửi email xác minh.
 *       Trong dev/test, response trả luôn `verifyToken` để dễ test.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Đăng ký thành công!" }
 *                 note: { type: string, example: "Vui lòng kiểm tra email để xác minh tài khoản." }
 *                 verifyToken: { type: string, description: "Chỉ trả trong NODE_ENV != production" }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/register", authLimiter, authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     description: |
 *       Trả về access token + set refresh token vào HttpOnly cookie.
 *       Có chống timing attack (dummy bcrypt compare khi user không tồn tại).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login thành công
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "refreshToken=eyJ...; HttpOnly; SameSite=Strict; Max-Age=604800"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/login", authLimiter, authController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Cấp access token mới
 *     description: Đọc refresh token từ cookie, verify khớp với DB, trả access token mới (15 phút).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Access token mới
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post("/refresh", authController.refreshToken);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất
 *     description: Xóa refresh token khỏi DB + clear cookie. Idempotent (gọi không có cookie → 204).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Đăng xuất thành công" }
 *       204:
 *         description: Không có cookie (đã logout sẵn)
 */
router.post("/logout", authController.logout);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Password]
 *     summary: Yêu cầu reset password
 *     description: |
 *       Sinh reset token (TTL 15 phút), lưu SHA-256 hash vào DB, gửi email.
 *       **Anti-enumeration**: trả 200 generic kể cả khi user không tồn tại — không tiết lộ.
 *       Dev/test trả `resetToken` trong response để dễ test.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Email đã gửi (hoặc giả vờ đã gửi)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 resetToken: { type: string, description: "Chỉ trả trong NODE_ENV != production" }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/forgot-password", authLimiter, authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Password]
 *     summary: Đặt lại password bằng token
 *     description: |
 *       Verify token + đặt password mới. Sau khi reset:
 *       - Token bị xóa (single-use)
 *       - Refresh token bị clear (revoke mọi session)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Đổi password thành công
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/reset-password", authLimiter, authController.resetPassword);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Email]
 *     summary: Xác minh email
 *     description: |
 *       Verify email bằng token nhận từ email. Sau khi verify:
 *       - `isVerified=true`
 *       - Token bị xóa (single-use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Verify thành công
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/verify-email", authLimiter, authController.verifyEmail);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Email]
 *     summary: Gửi lại email xác minh
 *     description: |
 *       Sinh verify token mới, vô hiệu hóa token cũ (rotation), gửi lại email.
 *       **Anti-enumeration**: trả 200 generic kể cả khi email không tồn tại HOẶC user đã verify.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Đã gửi (hoặc giả vờ)
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post(
  "/resend-verification",
  authLimiter,
  authController.resendVerification
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [User]
 *     summary: Thông tin user hiện tại
 *     description: Trả về user info từ access token. Đã loại password và các token nhạy cảm.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/me", verifyToken, authController.me);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Đổi password (khi đã login)
 *     description: |
 *       Yêu cầu Bearer token. Verify currentPassword bằng bcrypt, sau đó:
 *       - Hash newPassword và lưu
 *       - Revoke refresh token (logout mọi thiết bị)
 *
 *       Không có rate limit vì user đã authenticated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: "oldpass123" }
 *               newPassword: { type: string, minLength: 8, example: "newpass456" }
 *     responses:
 *       200: { description: Đổi password thành công }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post("/change-password", verifyToken, authController.changePassword);

module.exports = router;

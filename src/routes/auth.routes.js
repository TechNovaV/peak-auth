const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimiter");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.post("/verify-email", authLimiter, authController.verifyEmail);
router.post("/resend-verification", authLimiter, authController.resendVerification);
router.get("/me", verifyToken, authController.me);

module.exports = router;

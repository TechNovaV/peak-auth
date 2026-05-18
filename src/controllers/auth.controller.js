const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  validateCredentials,
  validatePassword,
  validateEmail,
  httpError,
} = require("../utils/validators");
const { generateToken, hashToken } = require("../utils/tokens");
const {
  sendResetPasswordEmail,
  sendVerificationEmail,
} = require("../services/mailer");
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  REFRESH_COOKIE_MAX_AGE,
  SALT_ROUNDS,
  NODE_ENV,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
} = require("../config/env");

// Dummy hash dùng để so sánh khi user không tồn tại — chống timing attack
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8tnZjL2gqgPmQzQXZmZ3hY9oFrEZQK";

const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: "peak-app",
  });

const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: "peak-app",
  });

const setRefreshCookie = (res, token) =>
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

exports.register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;
    const credErr = validateCredentials(username, password);
    if (credErr) throw httpError(400, credErr);
    const emailErr = validateEmail(email);
    if (emailErr) throw httpError(400, emailErr);

    const exists = await User.findOne({ username });
    if (exists) throw httpError(409, "Tên đăng nhập đã tồn tại!");

    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) throw httpError(409, "Email đã được sử dụng!");
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const userData = { username, password: hashed };
    let rawVerifyToken = null;

    if (email) {
      const { raw, hash } = generateToken();
      rawVerifyToken = raw;
      userData.email = email;
      userData.emailVerificationToken = hash;
      userData.emailVerificationExpires = new Date(
        Date.now() + VERIFY_TOKEN_TTL_MS
      );
    }

    const user = await User.create(userData);

    if (email && rawVerifyToken) {
      await sendVerificationEmail({
        to: email,
        username: user.username,
        verifyToken: rawVerifyToken,
      }).catch((e) => console.error("[Mailer error]", e.message));
    }

    const payload = { message: "Đăng ký thành công!" };
    if (email) payload.note = "Vui lòng kiểm tra email để xác minh tài khoản.";
    if (NODE_ENV !== "production" && rawVerifyToken)
      payload.verifyToken = rawVerifyToken;

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const err = validateCredentials(username, password);
    if (err) throw httpError(400, err);

    const user = await User.findOne({ username });

    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !isMatch) throw httpError(401, "Sai tài khoản hoặc mật khẩu");

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({ message: "Đăng nhập thành công", accessToken });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw httpError(401, "Không tìm thấy Refresh Token");

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      throw httpError(403, "Refresh Token không hợp lệ hoặc hết hạn");
    }

    const user = await User.findById(decoded.sub);
    if (!user || user.refreshToken !== token)
      throw httpError(403, "Refresh Token không khớp");

    const newAccessToken = signAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.sendStatus(204);

    await User.findOneAndUpdate(
      { refreshToken: token },
      { refreshToken: null }
    );
    res.clearCookie("refreshToken");
    res.json({ message: "Đăng xuất thành công" });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select(
      "-password -refreshToken -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires"
    );
    if (!user) throw httpError(404, "Không tìm thấy người dùng");
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// Message dùng chung — KHÔNG được tiết lộ user có tồn tại hay không (chống enumeration)
const FORGOT_GENERIC_MSG =
  "Nếu tài khoản tồn tại, link đặt lại mật khẩu đã được gửi tới email.";

exports.forgotPassword = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    if (!username && !email)
      throw httpError(400, "Cần cung cấp username hoặc email");

    const query = email ? { email: String(email).toLowerCase() } : { username };
    const user = await User.findOne(query);

    // Vẫn trả 200 dù user không tồn tại — không leak thông tin
    if (!user) return res.json({ message: FORGOT_GENERIC_MSG });

    const { raw, hash } = generateToken();
    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    // Gửi email (dev: log console; prod: SMTP)
    if (user.email) {
      await sendResetPasswordEmail({
        to: user.email,
        username: user.username,
        resetToken: raw,
      }).catch((e) => console.error("[Mailer error]", e.message));
    } else {
      // User chưa có email — log link ra console để dev tự copy
      console.log(
        `📧 [DEV] Reset link cho '${user.username}': /reset-password?token=${raw}`
      );
    }

    const payload = { message: FORGOT_GENERIC_MSG };
    // CHỈ dev mode: trả token qua response để dễ test
    if (NODE_ENV !== "production") payload.resetToken = raw;

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string")
      throw httpError(400, "Thiếu hoặc token không hợp lệ");

    const hash = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hash,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) throw httpError(400, "Token không hợp lệ hoặc đã hết hạn");

    // Idempotent: nếu đã verify rồi vẫn trả 200 thân thiện
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Xác minh email thành công!" });
  } catch (err) {
    next(err);
  }
};

// Message dùng chung cho resend — chống enumeration (giống forgot password)
const RESEND_GENERIC_MSG =
  "Nếu email tồn tại và chưa xác minh, link xác minh đã được gửi lại.";

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const emailErr = validateEmail(email);
    if (!email || emailErr)
      throw httpError(400, emailErr || "Cần cung cấp email");

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Trả 200 generic dù: user không tồn tại HOẶC đã verify rồi
    if (!user || user.isVerified)
      return res.json({ message: RESEND_GENERIC_MSG });

    const { raw, hash } = generateToken();
    user.emailVerificationToken = hash;
    user.emailVerificationExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      verifyToken: raw,
    }).catch((e) => console.error("[Mailer error]", e.message));

    const payload = { message: RESEND_GENERIC_MSG };
    if (NODE_ENV !== "production") payload.verifyToken = raw;
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== "string")
      throw httpError(400, "Thiếu hoặc token không hợp lệ");

    const pwdErr = validatePassword(password);
    if (pwdErr) throw httpError(400, pwdErr);

    const hash = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) throw httpError(400, "Token không hợp lệ hoặc đã hết hạn");

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshToken = null; // Revoke mọi session đang mở
    await user.save();

    res.json({
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (err) {
    next(err);
  }
};

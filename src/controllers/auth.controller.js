const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const {
  validateCredentials,
  validateUsername,
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

const signAccessToken = (user, sid) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, sid: sid.toString() },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL, issuer: "peak-app" }
  );

const signRefreshToken = (user, sid) =>
  jwt.sign(
    { sub: user._id.toString(), sid: sid.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL, issuer: "peak-app" }
  );

const setRefreshCookie = (res, token) =>
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    // "lax" thay vì "strict" để cho phép cross-origin requests trong dev
    // (frontend localhost:5500 → backend localhost:3000 vẫn same-site theo Lax)
    sameSite: NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

exports.register = async (req, res, next) => {
  try {
    const { username, password, email, fullName } = req.body;
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

    const userData = { username, password: hashed, fullName: fullName || "" };
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
    const { username, email, password } = req.body;

    const pwdErr = validatePassword(password);
    if (pwdErr) throw httpError(400, pwdErr);

    if (!username && !email)
      throw httpError(400, "Cần cung cấp username hoặc email");

    if (username !== undefined) {
      const err = validateUsername(username);
      if (err) throw httpError(400, err);
    }
    if (email !== undefined) {
      const err = validateEmail(email);
      if (err) throw httpError(400, err);
    }

    const user = email
      ? await User.findOne({ email: String(email).toLowerCase() })
      : await User.findOne({ username });

    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !isMatch) throw httpError(401, "Sai tài khoản hoặc mật khẩu");

    // Pre-generate session ID để gắn vào cả JWT lẫn DB
    const sid = new mongoose.Types.ObjectId();
    const accessToken = signAccessToken(user, sid);
    const refreshToken = signRefreshToken(user, sid);

    user.sessions.push({
      _id: sid,
      tokenHash: hashToken(refreshToken),
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || "",
      lastUsed: new Date(),
    });
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
    if (!user) throw httpError(403, "Refresh Token không khớp");

    const tokenHash = hashToken(token);
    const session = user.sessions.find((s) => s.tokenHash === tokenHash);
    if (!session) throw httpError(403, "Refresh Token không khớp");

    session.lastUsed = new Date();
    await user.save();

    const newAccessToken = signAccessToken(user, session._id);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.sendStatus(204);

    const tokenHash = hashToken(token);
    // Chỉ xóa session khớp với cookie hiện tại — các session khác giữ nguyên
    await User.updateOne(
      { "sessions.tokenHash": tokenHash },
      { $pull: { sessions: { tokenHash } } }
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
      "-password -sessions -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires"
    );
    if (!user) throw httpError(404, "Không tìm thấy người dùng");
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    // Đánh dấu session hiện tại dựa vào sid trong JWT access token
    const currentSid = req.user.sid;

    const sessions = user.sessions.map((s) => ({
      _id: s._id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastUsed: s.lastUsed,
      current: s._id.toString() === currentSid,
    }));

    res.json({ count: sessions.length, sessions });
  } catch (err) {
    next(err);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id))
      throw httpError(400, "Session ID không hợp lệ");

    const user = await User.findById(req.user.sub);
    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    const session = user.sessions.id(id);
    if (!session) throw httpError(404, "Session không tồn tại");

    user.sessions.pull(id);
    await user.save();

    res.json({ message: "Đã thu hồi session" });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string")
      throw httpError(400, "Cần xác nhận mật khẩu để xóa tài khoản");

    const user = await User.findById(req.user.sub);
    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw httpError(401, "Mật khẩu không đúng");

    await User.findByIdAndDelete(user._id);
    res.clearCookie("refreshToken");

    res.json({
      message: "Xóa tài khoản thành công. Mọi dữ liệu liên quan đã được xóa.",
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { username, email, fullName, bio, school } = req.body;
    // `class` là từ khóa JS, phải truy cập gián tiếp
    const userClass = req.body.class;

    if (
      username === undefined &&
      email === undefined &&
      fullName === undefined &&
      bio === undefined &&
      school === undefined &&
      userClass === undefined
    )
      throw httpError(400, "Cần cung cấp ít nhất 1 field để cập nhật");

    const user = await User.findById(req.user.sub);
    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    let rawVerifyToken = null;

    if (fullName !== undefined) {
      if (typeof fullName !== "string")
        throw httpError(400, "fullName không hợp lệ");
      user.fullName = fullName.trim();
    }

    // Validate text fields với độ dài tối đa
    const setTextField = (field, value, max, label) => {
      if (value === undefined) return;
      if (typeof value !== "string")
        throw httpError(400, `${label} không hợp lệ`);
      if (value.length > max)
        throw httpError(400, `${label} không quá ${max} ký tự`);
      user[field] = value.trim();
    };
    setTextField("bio", bio, 500, "Bio");
    setTextField("school", school, 100, "School");
    setTextField("class", userClass, 50, "Class");

    // Validate + apply username
    if (username !== undefined && username !== user.username) {
      const err = validateUsername(username);
      if (err) throw httpError(400, err);
      const exists = await User.findOne({ username });
      if (exists) throw httpError(409, "Tên đăng nhập đã tồn tại!");
      user.username = username;
    }

    // Validate + apply email
    if (email !== undefined) {
      const normalized = String(email).toLowerCase();
      if (normalized !== user.email) {
        if (!email) throw httpError(400, "Email không hợp lệ");
        const err = validateEmail(email);
        if (err) throw httpError(400, err);
        const exists = await User.findOne({ email: normalized });
        if (exists) throw httpError(409, "Email đã được sử dụng!");

        user.email = normalized;
        user.isVerified = false;

        const { raw, hash } = generateToken();
        rawVerifyToken = raw;
        user.emailVerificationToken = hash;
        user.emailVerificationExpires = new Date(
          Date.now() + VERIFY_TOKEN_TTL_MS
        );

        await sendVerificationEmail({
          to: normalized,
          username: user.username,
          verifyToken: raw,
        }).catch((e) => console.error("[Mailer error]", e.message));
      }
    }

    await user.save();

    // Trả về user không có field nhạy cảm
    const sanitized = await User.findById(user._id).select(
      "-password -sessions -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires"
    );

    const payload = { message: "Cập nhật profile thành công", user: sanitized };
    if (NODE_ENV !== "production" && rawVerifyToken)
      payload.verifyToken = rawVerifyToken;

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== "string")
      throw httpError(400, "Thiếu mật khẩu hiện tại");

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) throw httpError(400, pwdErr);

    if (currentPassword === newPassword)
      throw httpError(400, "Mật khẩu mới phải khác mật khẩu cũ");

    const user = await User.findById(req.user.sub);
    if (!user) throw httpError(404, "Không tìm thấy người dùng");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw httpError(401, "Mật khẩu hiện tại không đúng");

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.sessions = []; // Revoke mọi session đang mở (như reset password)
    await user.save();

    res.json({
      message:
        "Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.",
    });
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
    user.sessions = []; // Revoke mọi session đang mở
    await user.save();

    res.json({
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (err) {
    next(err);
  }
};

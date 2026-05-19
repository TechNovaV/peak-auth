const { NODE_ENV, CLIENT_URL } = require("../config/env");

// CLIENT_URL có thể là nhiều origin phân cách bằng dấu phẩy.
// Cho mailer link: dùng cái đầu tiên (assumption: đó là frontend chính).
const PRIMARY_CLIENT_URL = CLIENT_URL.split(",")[0].trim();

/**
 * Stub mailer — hiện log ra console.
 *
 * Khi muốn gửi email thật:
 *  1. npm i nodemailer
 *  2. Thêm vào .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 *  3. Sửa hàm sendMail() bên dưới dùng nodemailer.createTransport()
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (NODE_ENV === "test") return { mocked: true };
  if (NODE_ENV === "development") {
    console.log("─".repeat(60));
    console.log("📧 [DEV MAILER] Email sẽ được gửi:");
    console.log("  To:", to);
    console.log("  Subject:", subject);
    console.log("  Body:", text || html);
    console.log("─".repeat(60));
    return { mocked: true };
  }

  // TODO: gắn nodemailer ở đây cho production
  throw new Error("Mailer chưa được cấu hình cho production");
};

const sendResetPasswordEmail = async ({ to, username, resetToken }) => {
  const link = `${PRIMARY_CLIENT_URL}/reset-password?token=${resetToken}`;
  return sendMail({
    to,
    subject: "Đặt lại mật khẩu",
    text: `Xin chào ${username},

Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Bấm vào link dưới đây trong 15 phút:
${link}

Nếu không phải bạn, hãy bỏ qua email này.`,
  });
};

const sendVerificationEmail = async ({ to, username, verifyToken }) => {
  const link = `${PRIMARY_CLIENT_URL}/verify-email?token=${verifyToken}`;
  return sendMail({
    to,
    subject: "Xác minh địa chỉ email",
    text: `Xin chào ${username},

Cảm ơn bạn đã đăng ký! Hãy bấm vào link dưới đây trong 24 giờ để xác minh email:
${link}

Nếu không phải bạn, hãy bỏ qua email này.`,
  });
};

module.exports = { sendMail, sendResetPasswordEmail, sendVerificationEmail };

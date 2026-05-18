const validateUsername = (username) => {
  if (!username || typeof username !== "string" || username.length < 3)
    return "Tên đăng nhập phải có ít nhất 3 ký tự.";
  return null;
};

const validatePassword = (password) => {
  if (!password || typeof password !== "string" || password.length < 8)
    return "Mật khẩu phải có ít nhất 8 ký tự.";
  return null;
};

const validateEmail = (email) => {
  if (email === undefined || email === null || email === "") return null; // optional
  if (typeof email !== "string") return "Email không hợp lệ";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? null : "Email không hợp lệ";
};

const validateCredentials = (username, password) => {
  return validateUsername(username) || validatePassword(password);
};

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = {
  validateUsername,
  validatePassword,
  validateEmail,
  validateCredentials,
  httpError,
};

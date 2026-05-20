// ============================================================
//  PEAK! – Internationalization  (vi / en)
// ============================================================

const PEAK_I18N = {
  vi: {
    // Common
    "field.email": "Email",
    "field.password": "Mật khẩu",
    "field.confirm_password": "Nhập lại mật khẩu",
    "field.fullname": "Họ và tên",
    "placeholder.email": "ban@example.com",
    "placeholder.password": "Ít nhất 8 ký tự",
    "placeholder.confirm_password": "Nhập lại mật khẩu",
    "placeholder.fullname": "Nguyễn Văn A",
    "common.logout": "Đăng xuất",
    "common.back_login": "Quay lại đăng nhập",
    "loading": "Đang xử lý...",

    // Login
    "login.subtitle": "Chào mừng quay trở lại!",
    "login.btn": "Đăng nhập",
    "login.no_account": "Chưa có tài khoản?",
    "login.register_link": "Đăng ký ngay",
    "login.remember": "Ghi nhớ đăng nhập",
    "login.forgot": "Quên mật khẩu?",

    // Register
    "register.subtitle": "Tạo tài khoản mới",
    "register.btn": "Đăng ký",
    "register.have_account": "Đã có tài khoản?",
    "register.login_link": "Đăng nhập",
    "register.agree": "Tôi đồng ý với",
    "register.terms": "Điều khoản",

    // Forgot password
    "forgot.subtitle": "Đặt lại mật khẩu",
    "forgot.desc": "Nhập email đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu.",
    "forgot.btn": "Gửi link",
    "forgot.remember": "Nhớ mật khẩu rồi?",

    // Reset password
    "reset.subtitle": "Đặt lại mật khẩu",
    "reset.new_password": "Mật khẩu mới",
    "reset.btn": "Đặt lại mật khẩu",

    // Home
    "home.search_placeholder": "Tìm kiếm trên PEAK!",
    "home.nav.home": "Trang chủ",
    "home.nav.friends": "Bạn bè",
    "home.nav.videos": "Video",
    "home.nav.groups": "Nhóm",
    "home.nav.messages": "Tin nhắn",
    "home.nav.notifications": "Thông báo",
    "home.nav.account": "Tài khoản",
    "home.dropdown.profile": "Trang cá nhân",
    "home.dropdown.settings": "Cài đặt",
    "home.dropdown.help": "Trợ giúp",
    "home.sidebar.friends": "Bạn bè",
    "home.sidebar.groups": "Nhóm",
    "home.sidebar.videos": "Video",
    "home.sidebar.marketplace": "Marketplace",
    "home.sidebar.memories": "Kỷ niệm",
    "home.sidebar.saved": "Đã lưu",
    "home.composer.placeholder": "Bạn đang nghĩ gì thế?",
    "home.composer.post": "Đăng",
    "home.posts.loading": "Đang tải bài viết...",
    "home.contacts": "Người liên hệ",

    // Dashboard
    "dashboard.subtitle": "Chào mừng đến với cộng đồng",
    "dashboard.name": "Tên:",
    "dashboard.email_label": "Email:",
    "dashboard.user_id": "User ID:",
    "dashboard.next": "Bước tiếp theo: xây dựng tính năng chat",

    // Profile
    "profile.title": "Trang cá nhân",
    "profile.subtitle": "Quản lý ảnh đại diện và thông tin của bạn",
    "profile.avatar_hint": "Bấm icon máy ảnh để đổi ảnh đại diện (tối đa 2MB)",
    "profile.full_name": "Họ và tên",
    "profile.username": "Tên đăng nhập (username)",
    "profile.username_hint": "Chỉ chữ thường, số và dấu gạch dưới. Bạn bè sẽ tìm bạn qua tên này.",
    "profile.username_placeholder": "vd: thien_2k10",
    "profile.bio": "Giới thiệu",
    "profile.bio_placeholder": "Vài dòng về bạn...",
    "profile.school": "Trường",
    "profile.school_placeholder": "THCS Nguyễn Huệ",
    "profile.class": "Lớp",
    "profile.class_placeholder": "9A2",
    "profile.cancel": "Hủy",
    "profile.save": "Lưu thay đổi",

    // Validation errors
    "err.required_email": "Vui lòng nhập email",
    "err.invalid_email": "Email không hợp lệ",
    "err.required_password": "Vui lòng nhập mật khẩu",
    "err.password_min6": "Mật khẩu phải có ít nhất 6 ký tự",
    "err.password_min8": "Mật khẩu phải có ít nhất 8 ký tự",
    "err.passwords_mismatch": "Mật khẩu nhập lại không khớp",
    "err.fullname_min2": "Họ tên phải có ít nhất 2 ký tự",
    "err.username_format": "Username 3-30 ký tự, chỉ chữ thường, số và dấu gạch dưới",
    "err.username_taken": "Username này đã có người dùng, chọn tên khác",
    "err.post_max_chars": "Bài viết tối đa 1000 ký tự",
    "err.post_load_error": "Lỗi tải bài viết",
    "err.post_error": "Lỗi đăng bài",
    "err.delete_error": "Lỗi",
    "err.reset_link_invalid": "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (1 giờ). Vui lòng gửi lại yêu cầu.",

    // Messages & alerts
    "msg.register_confirm_email": "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.",
    "msg.reset_success": "✓ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
    "msg.forgot_success": "✓ Đã gửi email đặt lại mật khẩu (nếu email tồn tại trong hệ thống). Kiểm tra hộp thư.",
    "msg.profile_saved": "✓ Đã lưu thay đổi",
    "msg.confirm_delete": "Xóa bài viết này?",
    "msg.no_posts": "Chưa có bài viết nào. Hãy là người đầu tiên!",

    // Post actions
    "post.like": "Thích",
    "post.comment": "Bình luận",
    "post.share": "Chia sẻ",
    "post.delete_title": "Xóa bài",
    "post.unknown_user": "Người dùng",
    "post.comment_placeholder": "Viết bình luận...",
    "post.view_all": "Xem tất cả",
    "post.comments_word": "bình luận",
    "err.comment_error": "Lỗi gửi bình luận",

    // Time ago
    "time.just_now": "vừa xong",
    "time.minutes_ago": " phút trước",
    "time.hours_ago": " giờ trước",
    "time.days_ago": " ngày trước",

    // Notifications
    "notif.title": "Thông báo",
    "notif.empty": "Chưa có thông báo nào",
    "notif.clear_all": "Xóa tất cả",
    "notif.enable_push": "🔔 Bật thông báo điện thoại",
    "notif.push_enabled": "✓ Đã bật thông báo",
    "notif.push_denied": "Thông báo bị chặn trong cài đặt trình duyệt",
    "notif.new_message": "Tin nhắn mới",
    "notif.liked_your_post": "đã thích bài viết của bạn",
    "notif.commented": "đã bình luận",
    "notif.sent_photo": "đã gửi một ảnh",
    "notif.new_post": "vừa đăng bài mới",

    // Profile page feedback
    "profile.avatar_size_error": "❌ Ảnh quá lớn (tối đa 2MB)",
    "profile.avatar_type_error": "❌ Chỉ chấp nhận JPG, PNG hoặc WebP",
    "profile.avatar_uploading": "Đang tải ảnh lên...",
    "profile.avatar_upload_error": "❌ Tải lên thất bại",
    "profile.avatar_url_error": "❌ Lưu URL thất bại",
    "profile.avatar_success": "✓ Đã cập nhật ảnh đại diện",
  },

  en: {
    // Common
    "field.email": "Email",
    "field.password": "Password",
    "field.confirm_password": "Confirm password",
    "field.fullname": "Full name",
    "placeholder.email": "you@example.com",
    "placeholder.password": "At least 8 characters",
    "placeholder.confirm_password": "Repeat password",
    "placeholder.fullname": "John Doe",
    "common.logout": "Sign out",
    "common.back_login": "Back to sign in",
    "loading": "Processing...",

    // Login
    "login.subtitle": "Welcome back!",
    "login.btn": "Sign in",
    "login.no_account": "Don't have an account?",
    "login.register_link": "Sign up",
    "login.remember": "Remember me",
    "login.forgot": "Forgot password?",

    // Register
    "register.subtitle": "Create new account",
    "register.btn": "Sign up",
    "register.have_account": "Already have an account?",
    "register.login_link": "Sign in",
    "register.agree": "I agree to the",
    "register.terms": "Terms",

    // Forgot password
    "forgot.subtitle": "Reset password",
    "forgot.desc": "Enter your registered email. We'll send you a reset link.",
    "forgot.btn": "Send link",
    "forgot.remember": "Remember your password?",

    // Reset password
    "reset.subtitle": "Reset password",
    "reset.new_password": "New password",
    "reset.btn": "Reset password",

    // Home
    "home.search_placeholder": "Search on PEAK!",
    "home.nav.home": "Home",
    "home.nav.friends": "Friends",
    "home.nav.videos": "Video",
    "home.nav.groups": "Groups",
    "home.nav.messages": "Messages",
    "home.nav.notifications": "Notifications",
    "home.nav.account": "Account",
    "home.dropdown.profile": "Profile",
    "home.dropdown.settings": "Settings",
    "home.dropdown.help": "Help",
    "home.sidebar.friends": "Friends",
    "home.sidebar.groups": "Groups",
    "home.sidebar.videos": "Video",
    "home.sidebar.marketplace": "Marketplace",
    "home.sidebar.memories": "Memories",
    "home.sidebar.saved": "Saved",
    "home.composer.placeholder": "What's on your mind?",
    "home.composer.post": "Post",
    "home.posts.loading": "Loading posts...",
    "home.contacts": "Contacts",

    // Dashboard
    "dashboard.subtitle": "Welcome to the community",
    "dashboard.name": "Name:",
    "dashboard.email_label": "Email:",
    "dashboard.user_id": "User ID:",
    "dashboard.next": "Next step: build chat feature",

    // Profile
    "profile.title": "My Profile",
    "profile.subtitle": "Manage your avatar and information",
    "profile.avatar_hint": "Click the camera icon to change your avatar (max 2MB)",
    "profile.full_name": "Full name",
    "profile.username": "Username",
    "profile.username_hint": "Only lowercase letters, numbers and underscores. Friends will find you by this name.",
    "profile.username_placeholder": "e.g. john_doe",
    "profile.bio": "Bio",
    "profile.bio_placeholder": "A few lines about you...",
    "profile.school": "School",
    "profile.school_placeholder": "e.g. Nguyen Hue Middle School",
    "profile.class": "Class",
    "profile.class_placeholder": "e.g. 9A2",
    "profile.cancel": "Cancel",
    "profile.save": "Save changes",

    // Validation errors
    "err.required_email": "Please enter your email",
    "err.invalid_email": "Invalid email address",
    "err.required_password": "Please enter your password",
    "err.password_min6": "Password must be at least 6 characters",
    "err.password_min8": "Password must be at least 8 characters",
    "err.passwords_mismatch": "Passwords do not match",
    "err.fullname_min2": "Full name must be at least 2 characters",
    "err.username_format": "Username 3-30 characters, only lowercase letters, numbers and underscores",
    "err.username_taken": "This username is already taken, please choose another",
    "err.post_max_chars": "Post must be 1000 characters or less",
    "err.post_load_error": "Error loading posts",
    "err.post_error": "Error posting",
    "err.delete_error": "Error",
    "err.reset_link_invalid": "Password reset link is invalid or expired (1 hour). Please request a new one.",

    // Messages & alerts
    "msg.register_confirm_email": "Registration successful! Please check your email to confirm your account.",
    "msg.reset_success": "✓ Password changed successfully! Please sign in again.",
    "msg.forgot_success": "✓ Password reset email sent (if the email exists in the system). Check your inbox.",
    "msg.profile_saved": "✓ Changes saved",
    "msg.confirm_delete": "Delete this post?",
    "msg.no_posts": "No posts yet. Be the first!",

    // Post actions
    "post.like": "Like",
    "post.comment": "Comment",
    "post.share": "Share",
    "post.delete_title": "Delete post",
    "post.unknown_user": "User",
    "post.comment_placeholder": "Write a comment...",
    "post.view_all": "View all",
    "post.comments_word": "comments",
    "err.comment_error": "Error posting comment",

    // Time ago
    "time.just_now": "just now",
    "time.minutes_ago": " minutes ago",
    "time.hours_ago": " hours ago",
    "time.days_ago": " days ago",

    // Notifications
    "notif.title": "Notifications",
    "notif.empty": "No notifications yet",
    "notif.clear_all": "Clear all",
    "notif.enable_push": "🔔 Enable phone notifications",
    "notif.push_enabled": "✓ Notifications enabled",
    "notif.push_denied": "Notifications blocked in browser settings",
    "notif.new_message": "New message",
    "notif.liked_your_post": "liked your post",
    "notif.commented": "commented",
    "notif.sent_photo": "sent a photo",
    "notif.new_post": "just posted",

    // Profile page feedback
    "profile.avatar_size_error": "❌ File too large (max 2MB)",
    "profile.avatar_type_error": "❌ Only JPG, PNG or WebP accepted",
    "profile.avatar_uploading": "Uploading...",
    "profile.avatar_upload_error": "❌ Upload failed",
    "profile.avatar_url_error": "❌ Failed to save URL",
    "profile.avatar_success": "✓ Avatar updated",
  },
};

function getLang() {
  return localStorage.getItem("peak_lang") || "vi";
}

function t(key) {
  const lang = getLang();
  return (PEAK_I18N[lang] && PEAK_I18N[lang][key]) || (PEAK_I18N["vi"][key]) || key;
}

function applyTranslations() {
  document.documentElement.lang = getLang();

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const val = t(el.getAttribute("data-i18n"));
    if (val) el.textContent = val;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const val = t(el.getAttribute("data-i18n-placeholder"));
    if (val) el.placeholder = val;
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const val = t(el.getAttribute("data-i18n-title"));
    if (val) el.title = val;
  });

  const btn = document.getElementById("langToggleBtn");
  if (btn) btn.textContent = getLang() === "vi" ? "EN" : "VI";
}

(function injectLangToggle() {
  function create() {
    if (document.getElementById("langToggleBtn")) return;
    const btn = document.createElement("button");
    btn.id = "langToggleBtn";
    btn.className = "lang-toggle-btn";
    btn.textContent = getLang() === "vi" ? "EN" : "VI";
    btn.title = "Switch language / Đổi ngôn ngữ";
    btn.addEventListener("click", () => {
      localStorage.setItem("peak_lang", getLang() === "vi" ? "en" : "vi");
      applyTranslations();
    });
    document.body.appendChild(btn);
  }
  if (document.body) {
    create();
  } else {
    document.addEventListener("DOMContentLoaded", create);
  }
})();

document.addEventListener("DOMContentLoaded", applyTranslations);

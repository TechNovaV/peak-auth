// ============================================================
//  CẤU HÌNH SUPABASE
// ============================================================
//  Project URL + anon key lấy từ Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL = "https://iwxsrjvisxbhoakgcvgf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3eHNyanZpc3hiaG9ha2djdmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg3ODYsImV4cCI6MjA5NDY5NDc4Nn0.h8ichGNE2Hfts1twEX83z91JPhTNH11ssM6oSOo7SgI";

// Tạo Supabase client (dùng chung toàn app)
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ============================================================
//  HELPER: Lấy avatar URL từ profile, fallback ui-avatars
// ============================================================
function getDefaultAvatarUrl(name) {
  const safeName = encodeURIComponent(name || "User");
  return `https://ui-avatars.com/api/?name=${safeName}&background=4f46e5&color=fff&size=128&bold=true`;
}

// ============================================================
//  HELPER: Lấy session hiện tại
// ============================================================
async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

// ============================================================
//  HELPER: Lấy profile từ DB, tự tạo nếu chưa có
// ============================================================
async function fetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[fetchProfile]", error);
    return null;
  }
  return data;
}

// ============================================================
//  HELPER: Map lỗi Supabase Auth sang tiếng Việt
// ============================================================
function translateAuthError(message) {
  if (!message) return "Có lỗi xảy ra, vui lòng thử lại";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email hoặc mật khẩu không đúng";
  if (m.includes("user already registered") || m.includes("already exists"))
    return "Email này đã được đăng ký";
  if (m.includes("email not confirmed"))
    return "Email chưa xác nhận. Vui lòng kiểm tra hộp thư";
  if (m.includes("password should be at least"))
    return "Mật khẩu quá ngắn (tối thiểu 6 ký tự)";
  if (m.includes("rate limit"))
    return "Bạn thử quá nhiều lần. Đợi vài phút rồi thử lại";
  return message;
}

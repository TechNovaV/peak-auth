// ============================================================
//  CẤU HÌNH KẾT NỐI BACKEND
// ============================================================
//  Frontend được serve từ chính backend (express.static),
//  nên dùng relative URL "/api" — không cần CORS, không cần
//  hardcode hostname/port.
// ============================================================

const API_URL = "/api";

// LocalStorage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "peak.accessToken",
  USER_CACHE: "peak.user",
};

// ============================================================
//  API CLIENT
// ============================================================
//  Helper gọi API với:
//  - credentials: 'include' để gửi/nhận refresh cookie
//  - Authorization Bearer khi đã login
//  - Auto refresh token khi gặp 401, retry 1 lần
// ============================================================

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
  // Tránh refresh nhiều lần cùng lúc nếu nhiều request fail cùng lúc
  if (isRefreshing) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      return data.accessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function apiCall(method, path, body, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  // Nếu 401/403 và không phải request auth, thử refresh token rồi retry 1 lần
  if (
    (res.status === 401 || res.status === 403) &&
    !options.skipAuth &&
    !options.isRetry &&
    token
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await doFetch();
    } else {
      // Refresh fail → clear token, redirect login (trừ khi đang ở login)
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ============================================================
//  AUTH HELPERS
// ============================================================
const auth = {
  async login({ email, password }) {
    const { ok, status, data } = await apiCall(
      "POST",
      "/auth/login",
      { email, password },
      { skipAuth: true }
    );
    if (ok) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
    return { ok, status, data };
  },

  async register({ email, password, fullName }) {
    // Backend yêu cầu username — sinh từ email (phần trước @)
    const username = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    return apiCall(
      "POST",
      "/auth/register",
      { username, email, password, fullName },
      { skipAuth: true }
    );
  },

  async me() {
    return apiCall("GET", "/auth/me");
  },

  async logout() {
    const result = await apiCall("POST", "/auth/logout");
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    return result;
  },

  async updateProfile(updates) {
    return apiCall("PATCH", "/auth/profile", updates);
  },

  async forgotPassword({ email }) {
    return apiCall(
      "POST",
      "/auth/forgot-password",
      { email },
      { skipAuth: true }
    );
  },

  async resetPassword({ token, password }) {
    return apiCall(
      "POST",
      "/auth/reset-password",
      { token, password },
      { skipAuth: true }
    );
  },

  async uploadAvatar(file) {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch(`${API_URL}/auth/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      body: fd, // KHÔNG set Content-Type — browser tự thêm boundary cho multipart
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  isLoggedIn() {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
};

// ============================================================
//  POSTS API
// ============================================================
const posts = {
  list() {
    return apiCall("GET", "/posts");
  },
  create(content) {
    return apiCall("POST", "/posts", { content });
  },
  remove(id) {
    return apiCall("DELETE", `/posts/${id}`);
  },
  toggleLike(id) {
    return apiCall("POST", `/posts/${id}/like`);
  },
};

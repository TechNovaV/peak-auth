// ============================================================
//  HELPERS
// ============================================================
function showError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(inputId + "Error");
  if (input) input.classList.add("invalid");
  if (errorEl) errorEl.textContent = message;
}

function clearError(inputId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(inputId + "Error");
  if (input) input.classList.remove("invalid");
  if (errorEl) errorEl.textContent = "";
}

function clearAllErrors(ids) {
  ids.forEach(clearError);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(button, isLoading, normalText) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.original = button.textContent;
    button.textContent = "Đang xử lý...";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.original || normalText;
  }
}

function getDefaultAvatar(name) {
  const safeName = encodeURIComponent(name || "User");
  return `https://ui-avatars.com/api/?name=${safeName}&background=4f46e5&color=fff&size=128&bold=true`;
}

// ============================================================
//  LOGIN FORM
// ============================================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = loginForm.querySelector("button[type=submit]");

    clearAllErrors(["email", "password"]);

    let valid = true;
    if (!email) {
      showError("email", "Vui lòng nhập email");
      valid = false;
    } else if (!isValidEmail(email)) {
      showError("email", "Email không hợp lệ");
      valid = false;
    }
    if (!password) {
      showError("password", "Vui lòng nhập mật khẩu");
      valid = false;
    } else if (password.length < 8) {
      showError("password", "Mật khẩu phải có ít nhất 8 ký tự");
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { ok, status, data } = await auth.login({ email, password });
    setLoading(submitBtn, false, "Đăng nhập");

    if (!ok) {
      if (status === 401)
        showError("password", "Email hoặc mật khẩu không đúng");
      else if (status === 429)
        showError(
          "password",
          "Bạn thử quá nhiều lần. Đợi vài phút rồi thử lại"
        );
      else showError("password", data.message || "Có lỗi xảy ra, thử lại sau");
      return;
    }

    window.location.href = "home.html";
  });
}

// ============================================================
//  REGISTER FORM
// ============================================================
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitBtn = registerForm.querySelector("button[type=submit]");

    clearAllErrors(["fullname", "email", "password", "confirmPassword"]);

    let valid = true;
    if (!fullname || fullname.length < 2) {
      showError("fullname", "Họ tên phải có ít nhất 2 ký tự");
      valid = false;
    }
    if (!email) {
      showError("email", "Vui lòng nhập email");
      valid = false;
    } else if (!isValidEmail(email)) {
      showError("email", "Email không hợp lệ");
      valid = false;
    }
    if (!password || password.length < 8) {
      showError("password", "Mật khẩu phải có ít nhất 8 ký tự");
      valid = false;
    }
    if (password !== confirmPassword) {
      showError("confirmPassword", "Mật khẩu nhập lại không khớp");
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { ok, status, data } = await auth.register({
      email,
      password,
      fullName: fullname,
    });
    setLoading(submitBtn, false, "Đăng ký");

    if (!ok) {
      if (status === 409) {
        const isEmail = (data.message || "").toLowerCase().includes("email");
        showError(isEmail ? "email" : "fullname", data.message);
      } else if (status === 400) {
        showError("password", data.message);
      } else {
        showError("email", data.message || "Đăng ký thất bại");
      }
      return;
    }

    // Đăng ký thành công → auto login để vào home
    const loginRes = await auth.login({ email, password });
    if (loginRes.ok) {
      window.location.href = "home.html";
    } else {
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      window.location.href = "index.html";
    }
  });
}

// ============================================================
//  FORGOT PASSWORD FORM
// ============================================================
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const submitBtn = forgotForm.querySelector("button[type=submit]");
    const successMsg = document.getElementById("successMsg");

    clearError("email");

    if (!email) {
      showError("email", "Vui lòng nhập email");
      return;
    }
    if (!isValidEmail(email)) {
      showError("email", "Email không hợp lệ");
      return;
    }

    setLoading(submitBtn, true);
    const { ok, data } = await auth.forgotPassword({ email });
    setLoading(submitBtn, false, "Gửi link");

    if (!ok) {
      showError("email", data.message || "Có lỗi xảy ra");
      return;
    }

    // Anti-enumeration: backend luôn trả 200 dù email có/không tồn tại
    let msg = "✓ " + data.message;
    // Dev mode: backend trả luôn resetToken để dễ test
    if (data.resetToken) {
      msg +=
        '<br><br><strong>Dev mode link:</strong><br><a href="reset.html?token=' +
        data.resetToken +
        '" class="link">reset.html?token=' +
        data.resetToken.substring(0, 16) +
        "...</a>";
    }
    successMsg.innerHTML = msg;
    successMsg.classList.remove("hidden");
  });
}

// ============================================================
//  RESET PASSWORD FORM
// ============================================================
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  // Đọc token từ URL ?token=xxx
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const tokenErrorEl = document.getElementById("tokenError");

  if (!token) {
    tokenErrorEl.textContent =
      "Link đặt lại mật khẩu không hợp lệ (thiếu token).";
    tokenErrorEl.classList.remove("hidden");
    resetForm.querySelector("button[type=submit]").disabled = true;
  }

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!token) return;

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitBtn = resetForm.querySelector("button[type=submit]");

    clearAllErrors(["password", "confirmPassword"]);

    let valid = true;
    if (!password || password.length < 8) {
      showError("password", "Mật khẩu phải có ít nhất 8 ký tự");
      valid = false;
    }
    if (password !== confirmPassword) {
      showError("confirmPassword", "Mật khẩu nhập lại không khớp");
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { ok, data } = await auth.resetPassword({ token, password });
    setLoading(submitBtn, false, "Đặt lại mật khẩu");

    if (!ok) {
      tokenErrorEl.textContent = data.message || "Đặt lại thất bại";
      tokenErrorEl.classList.remove("hidden");
      return;
    }

    alert("✓ Đã đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
    window.location.href = "index.html";
  });
}

// ============================================================
//  DASHBOARD GUARD (trang debug cũ — vẫn giữ)
// ============================================================
const dashboardRoot = document.getElementById("dashboardRoot");
if (dashboardRoot) {
  (async () => {
    if (!auth.isLoggedIn()) {
      window.location.href = "index.html";
      return;
    }
    const { ok, data } = await auth.me();
    if (!ok) {
      window.location.href = "index.html";
      return;
    }
    const user = data.user;
    const fullName = user.fullName || user.username || "Bạn";
    document.getElementById("welcomeName").textContent = fullName;
    document.getElementById("welcomeEmail").textContent = user.email || "";
    document.getElementById("welcomeId").textContent = user._id;
    dashboardRoot.classList.remove("hidden");

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await auth.logout();
      window.location.href = "index.html";
    });
  })();
}

// ============================================================
//  HOME PAGE
// ============================================================
const homeRoot = document.getElementById("homeRoot");
if (homeRoot) {
  (async () => {
    // 1) Bảo vệ trang
    if (!auth.isLoggedIn()) {
      window.location.href = "index.html";
      return;
    }
    const { ok, data } = await auth.me();
    if (!ok) {
      window.location.href = "index.html";
      return;
    }

    const user = data.user;
    const fullName = user.fullName || user.username || "Bạn";
    const email = user.email || "";
    const avatarUrl = user.avatarUrl || getDefaultAvatar(fullName);

    // 2) Đổ data vào nav/sidebar/composer
    const setImg = (id) => {
      const el = document.getElementById(id);
      if (el) el.src = avatarUrl;
    };
    setImg("navAvatar");
    setImg("dropdownAvatar");
    setImg("sideAvatar");
    setImg("composerAvatar");

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText("dropdownName", fullName);
    setText("dropdownEmail", email);
    setText("sideName", fullName);
    setText(
      "composerPrompt",
      `${fullName.split(" ").pop()} ơi, bạn đang nghĩ gì?`
    );

    homeRoot.classList.remove("hidden");

    // 3) Dropdown
    const avatarBtn = document.getElementById("avatarBtn");
    const dropdown = document.getElementById("avatarDropdown");
    avatarBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
        dropdown.classList.add("hidden");
      }
    });

    // 4) Logout
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await auth.logout();
      window.location.href = "index.html";
    });

    // 5) POSTS FEATURE (Phase 5)
    // --- Helpers cho render post ---
    const currentUserId = user._id;
    const postsContainer = document.getElementById("postsContainer");

    // "5 phút trước", "2 giờ trước", "hôm qua"
    function timeAgo(dateStr) {
      const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
      if (seconds < 60) return "vừa xong";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + " phút trước";
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + " giờ trước";
      const days = Math.floor(hours / 24);
      if (days < 7) return days + " ngày trước";
      return new Date(dateStr).toLocaleDateString("vi-VN");
    }

    // Escape HTML để chống XSS khi insert content vào DOM
    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    function renderPost(post) {
      const authorName = post.author.fullName || post.author.username;
      const authorAvatar =
        post.author.avatarUrl || getDefaultAvatar(authorName);
      const canDelete =
        post.author._id === currentUserId || user.role === "admin";
      const likeIcon = post.likedByMe ? "❤️" : "♡";
      const likeClass = post.likedByMe ? "post-action liked" : "post-action";

      return `
        <article class="post card" data-id="${post._id}">
          <header class="post-header">
            <img class="post-avatar" src="${authorAvatar}" alt="" />
            <div>
              <div class="post-author">${escapeHtml(authorName)}</div>
              <div class="post-meta">${timeAgo(post.createdAt)}</div>
            </div>
            ${
              canDelete
                ? '<button class="post-more delete-btn" title="Xóa bài">⋯</button>'
                : ""
            }
          </header>
          <div class="post-body">${escapeHtml(post.content)}</div>
          <footer class="post-footer">
            <button class="${likeClass} like-btn">
              ${likeIcon} Thích <span class="like-count">${post.likeCount}</span>
            </button>
            <button class="post-action">💬 Bình luận</button>
            <button class="post-action">↪ Chia sẻ</button>
          </footer>
        </article>
      `;
    }

    async function loadFeed() {
      const { ok, data } = await posts.list();
      if (!ok) {
        postsContainer.innerHTML =
          '<p style="text-align:center;color:#dc2626;padding:24px">Lỗi tải bài viết</p>';
        return;
      }
      if (data.posts.length === 0) {
        postsContainer.innerHTML =
          '<p style="text-align:center;color:#6b7280;padding:24px">Chưa có bài viết nào. Hãy là người đầu tiên!</p>';
        return;
      }
      postsContainer.innerHTML = data.posts.map(renderPost).join("");
    }

    // Composer: đăng bài
    const composerForm = document.getElementById("composerForm");
    const composerInput = document.getElementById("composerInput");
    const composerCharCount = document.getElementById("composerCharCount");
    const composerSubmit = document.getElementById("composerSubmit");

    composerInput.addEventListener("input", () => {
      composerCharCount.textContent = composerInput.value.length + " / 1000";
    });

    composerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = composerInput.value.trim();
      if (!content) return;
      if (content.length > 1000) {
        alert("Bài viết tối đa 1000 ký tự");
        return;
      }

      setLoading(composerSubmit, true);
      const { ok, data: resp } = await posts.create(content);
      setLoading(composerSubmit, false, "Đăng");

      if (!ok) {
        alert("Lỗi: " + (resp.message || "Đăng bài thất bại"));
        return;
      }

      // Render post mới lên đầu feed
      composerInput.value = "";
      composerCharCount.textContent = "0 / 1000";
      const existingHtml = postsContainer.querySelector("article")
        ? postsContainer.innerHTML
        : "";
      postsContainer.innerHTML = renderPost(resp.post) + existingHtml;
    });

    // Event delegation: 1 listener cho cả container, xử lý like/delete
    postsContainer.addEventListener("click", async (e) => {
      const article = e.target.closest("article.post");
      if (!article) return;
      const postId = article.dataset.id;

      // Like button
      if (e.target.closest(".like-btn")) {
        const btn = e.target.closest(".like-btn");
        const { ok, data: resp } = await posts.toggleLike(postId);
        if (!ok) return;
        btn.querySelector(".like-count").textContent = resp.likeCount;
        if (resp.liked) {
          btn.classList.add("liked");
          btn.innerHTML = btn.innerHTML.replace("♡", "❤️");
        } else {
          btn.classList.remove("liked");
          btn.innerHTML = btn.innerHTML.replace("❤️", "♡");
        }
        return;
      }

      // Delete button
      if (e.target.closest(".delete-btn")) {
        if (!confirm("Xóa bài viết này?")) return;
        const { ok } = await posts.remove(postId);
        if (ok) article.remove();
        return;
      }
    });

    // Load feed lần đầu
    loadFeed();
  })();
}

// ============================================================
//  PROFILE PAGE — xem & sửa các trường có sẵn ở backend
//  (Backend hiện chỉ hỗ trợ: username, email, fullName)
//  Các trường bio/school/class/avatar sẽ được hỗ trợ ở Phase 2-3
// ============================================================
const profileRoot = document.getElementById("profileRoot");
if (profileRoot) {
  (async () => {
    if (!auth.isLoggedIn()) {
      window.location.href = "index.html";
      return;
    }
    const { ok, data } = await auth.me();
    if (!ok) {
      window.location.href = "index.html";
      return;
    }

    const user = data.user;
    const fullName = user.fullName || "";

    // Đổ data vào form
    document.getElementById("fullName").value = fullName;
    document.getElementById("username").value = user.username || "";

    // Phase 2: bio / school / class đã có backend support
    const bioInput = document.getElementById("bio");
    const schoolInput = document.getElementById("school");
    const classInput = document.getElementById("class");
    if (bioInput) {
      bioInput.value = user.bio || "";
      document.getElementById("bioCount").textContent = (user.bio || "").length;
      // Đếm ký tự realtime
      bioInput.addEventListener("input", () => {
        document.getElementById("bioCount").textContent = bioInput.value.length;
      });
    }
    if (schoolInput) schoolInput.value = user.school || "";
    if (classInput) classInput.value = user.class || "";

    // Avatar: dùng URL thật nếu có, fallback ui-avatars
    const avatarImg = document.getElementById("profileAvatar");
    avatarImg.src = user.avatarUrl || getDefaultAvatar(fullName);
    profileRoot.classList.remove("hidden");

    // Phase 3: Avatar upload real
    const avatarInput = document.getElementById("avatarInput");
    const avatarHint = document.getElementById("avatarHint");
    if (avatarHint)
      avatarHint.textContent =
        "Bấm icon máy ảnh để đổi ảnh đại diện (tối đa 2MB)";

    avatarInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        avatarHint.textContent = "❌ Ảnh quá lớn (tối đa 2MB)";
        avatarHint.style.color = "var(--error)";
        avatarInput.value = "";
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        avatarHint.textContent = "❌ Chỉ JPG, PNG hoặc WebP";
        avatarHint.style.color = "var(--error)";
        avatarInput.value = "";
        return;
      }

      avatarHint.textContent = "Đang tải lên...";
      avatarHint.style.color = "var(--text-light)";

      const { ok, data: resp } = await auth.uploadAvatar(file);

      if (!ok) {
        avatarHint.textContent = "❌ " + (resp.message || "Upload thất bại");
        avatarHint.style.color = "var(--error)";
        return;
      }

      // Cache-buster để browser tải ảnh mới ngay (không dùng bản cache cũ)
      avatarImg.src = resp.avatarUrl + "?t=" + Date.now();
      user.avatarUrl = resp.avatarUrl;
      avatarHint.textContent = "✓ Đã cập nhật ảnh đại diện";
      avatarHint.style.color = "var(--primary)";
    });

    // Feedback helper
    const feedbackEl = document.getElementById("formFeedback");
    const showFeedback = (msg, type = "success") => {
      feedbackEl.textContent = msg;
      feedbackEl.className = `form-feedback ${type}`;
      if (type === "success") {
        setTimeout(() => {
          feedbackEl.textContent = "";
          feedbackEl.className = "form-feedback";
        }, 3000);
      }
    };

    // Submit form — cập nhật mọi field
    const profileForm = document.getElementById("profileForm");
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newFullName = document.getElementById("fullName").value.trim();
      const newUsername = document
        .getElementById("username")
        .value.trim()
        .toLowerCase();
      const newBio = document.getElementById("bio").value;
      const newSchool = document.getElementById("school").value.trim();
      const newClass = document.getElementById("class").value.trim();
      const submitBtn = profileForm.querySelector("button[type=submit]");

      clearError("fullName");
      clearError("username");

      let valid = true;
      if (!newFullName || newFullName.length < 2) {
        showError("fullName", "Họ tên phải có ít nhất 2 ký tự");
        valid = false;
      }
      if (newUsername && newUsername.length < 3) {
        showError("username", "Username phải có ít nhất 3 ký tự");
        valid = false;
      }
      if (newBio.length > 500) {
        showFeedback("Bio không quá 500 ký tự", "error");
        valid = false;
      }
      if (!valid) return;

      // Chỉ gửi field thật sự thay đổi (so với giá trị ban đầu)
      const updates = {};
      if (newFullName !== fullName) updates.fullName = newFullName;
      if (newUsername && newUsername !== user.username)
        updates.username = newUsername;
      if (newBio !== (user.bio || "")) updates.bio = newBio;
      if (newSchool !== (user.school || "")) updates.school = newSchool;
      if (newClass !== (user.class || "")) updates.class = newClass;

      if (Object.keys(updates).length === 0) {
        showFeedback("Không có thay đổi nào", "success");
        return;
      }

      setLoading(submitBtn, true);
      const { ok, status, data: resData } = await auth.updateProfile(updates);
      setLoading(submitBtn, false, "Lưu thay đổi");

      if (!ok) {
        if (status === 409) {
          showError("username", "Username này đã có người dùng, chọn tên khác");
        } else {
          showFeedback(
            "Lỗi: " + (resData.message || "Cập nhật thất bại"),
            "error"
          );
        }
        return;
      }

      // Cập nhật user object để compare lần sau
      Object.assign(user, updates);
      showFeedback("✓ Đã lưu thay đổi", "success");
    });
  })();
}

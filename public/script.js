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
    const avatarUrl = getDefaultAvatar(fullName);

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

    // 5) Composer placeholder
    document.getElementById("composerInput")?.addEventListener("click", () => {
      alert("Tính năng đăng bài sẽ có ở Sprint sau nhé!");
    });
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

    document.getElementById("profileAvatar").src = getDefaultAvatar(fullName);
    profileRoot.classList.remove("hidden");

    // Avatar upload sẽ làm ở Phase 3 — tạm disable
    const avatarHint = document.getElementById("avatarHint");
    if (avatarHint) {
      avatarHint.textContent = "Upload ảnh đại diện sẽ có ở Phase 3";
    }
    const avatarInput = document.getElementById("avatarInput");
    if (avatarInput) avatarInput.disabled = true;

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

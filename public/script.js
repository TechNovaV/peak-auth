// ============================================================
//  HELPERS (chung cho mọi page)
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

function setLoading(button, isLoading, fallbackText) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent.trim();
    button.textContent = typeof t === "function" ? t("loading") : "Đang xử lý...";
  } else {
    button.disabled = false;
    const i18nKey = button.getAttribute("data-i18n");
    button.textContent = i18nKey && typeof t === "function"
      ? t(i18nKey)
      : (button.dataset.originalText || fallbackText || "");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const _t = typeof t === "function" ? t : (k) => k;
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return _t("time.just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + _t("time.minutes_ago");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + _t("time.hours_ago");
  const days = Math.floor(hours / 24);
  if (days < 7) return days + _t("time.days_ago");
  const locale = typeof getLang === "function" && getLang() === "en" ? "en-US" : "vi-VN";
  return new Date(dateStr).toLocaleDateString(locale);
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
      showError("email", t("err.required_email"));
      valid = false;
    } else if (!isValidEmail(email)) {
      showError("email", t("err.invalid_email"));
      valid = false;
    }
    if (!password) {
      showError("password", t("err.required_password"));
      valid = false;
    } else if (password.length < 6) {
      showError("password", t("err.password_min6"));
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(submitBtn, false);

    if (error) {
      showError("password", translateAuthError(error.message));
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
      showError("fullname", t("err.fullname_min2"));
      valid = false;
    }
    if (!email) {
      showError("email", t("err.required_email"));
      valid = false;
    } else if (!isValidEmail(email)) {
      showError("email", t("err.invalid_email"));
      valid = false;
    }
    if (!password || password.length < 6) {
      showError("password", t("err.password_min6"));
      valid = false;
    }
    if (password !== confirmPassword) {
      showError("confirmPassword", t("err.passwords_mismatch"));
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        // full_name lưu vào user_metadata. Trigger SQL sẽ copy sang profiles.full_name
        data: { full_name: fullname },
      },
    });
    setLoading(submitBtn, false);

    if (error) {
      showError("email", translateAuthError(error.message));
      return;
    }

    // Nếu Email Confirm BẬT, user phải xác nhận email trước → chưa có session
    if (data.user && !data.session) {
      alert(t("msg.register_confirm_email"));
      window.location.href = "index.html";
      return;
    }

    // Confirm email TẮT → vào thẳng home
    window.location.href = "home.html";
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
      showError("email", t("err.required_email"));
      return;
    }
    if (!isValidEmail(email)) {
      showError("email", t("err.invalid_email"));
      return;
    }

    setLoading(submitBtn, true);
    // Tự lấy đúng base URL dù chạy localhost hay GitHub Pages
    const baseUrl = window.location.href.replace(/[^/]*$/, "");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: baseUrl + "reset.html",
    });
    setLoading(submitBtn, false);

    if (error) {
      showError("email", translateAuthError(error.message));
      return;
    }

    successMsg.textContent = t("msg.forgot_success");
    successMsg.classList.remove("hidden");
  });
}

// ============================================================
//  RESET PASSWORD FORM
// ============================================================
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  const tokenErrorEl = document.getElementById("tokenError");
  const submitBtn = resetForm.querySelector("button[type=submit]");

  // Khoá nút submit cho đến khi Supabase xác nhận session hợp lệ
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.45";

  function unlockForm() {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    tokenErrorEl.classList.add("hidden");
  }

  function showTokenError(msg) {
    tokenErrorEl.textContent = msg;
    tokenErrorEl.classList.remove("hidden");
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.45";
  }

  // Supabase SDK v2 tự parse URL hash (#access_token=...&type=recovery)
  // và phát ra event PASSWORD_RECOVERY khi token hợp lệ
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      unlockForm();
    }
  });

  // Nếu user đã có session hợp lệ (ví dụ reload trang)
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) unlockForm();
  });

  // Sau 5 giây nếu vẫn khoá → link hết hạn hoặc sai
  setTimeout(() => {
    if (submitBtn.disabled) {
      showTokenError(t("err.reset_link_invalid"));
    }
  }, 5000);

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    clearAllErrors(["password", "confirmPassword"]);

    let valid = true;
    if (!password || password.length < 8) {
      showError("password", t("err.password_min8"));
      valid = false;
    }
    if (password !== confirmPassword) {
      showError("confirmPassword", t("err.passwords_mismatch"));
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    const { error } = await supabaseClient.auth.updateUser({ password });
    setLoading(submitBtn, false);

    if (error) {
      tokenErrorEl.textContent = translateAuthError(error.message);
      tokenErrorEl.classList.remove("hidden");
      return;
    }

    await supabaseClient.auth.signOut();
    alert(t("msg.reset_success"));
    window.location.href = "index.html";
  });
}

// ============================================================
//  DASHBOARD (debug page cũ — vẫn giữ)
// ============================================================
const dashboardRoot = document.getElementById("dashboardRoot");
if (dashboardRoot) {
  (async () => {
    const session = await requireSession();
    if (!session) return;
    const user = session.user;
    const fullName = user.user_metadata?.full_name || "Bạn";
    document.getElementById("welcomeName").textContent = fullName;
    document.getElementById("welcomeEmail").textContent = user.email;
    document.getElementById("welcomeId").textContent = user.id;
    dashboardRoot.classList.remove("hidden");
    document
      .getElementById("logoutBtn")
      .addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
      });
  })();
}

// ============================================================
//  HOME PAGE — feed + composer
// ============================================================
const homeRoot = document.getElementById("homeRoot");
if (homeRoot) {
  (async () => {
    const session = await requireSession();
    if (!session) return;

    const user = session.user;
    const profile = await fetchProfile(user.id);
    const fullName =
      profile?.full_name || user.user_metadata?.full_name || "Bạn";
    const email = user.email || "";
    const avatarUrl = profile?.avatar_url || getDefaultAvatarUrl(fullName);

    // Đổ data vào nav/sidebar/composer
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

    // Dropdown
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

    // Logout
    document
      .getElementById("logoutBtn")
      .addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
      });

    // ============== POSTS FEATURE ==============
    const postsContainer = document.getElementById("postsContainer");
    const currentUserId = user.id;

    function renderPost(post) {
      const author = post.author || {};
      const authorName = author.full_name || author.username || t("post.unknown_user");
      const authorAvatar = author.avatar_url || getDefaultAvatarUrl(authorName);
      const canDelete = post.author_id === currentUserId;
      const likedByMe = post.likedByMe;
      const likeClass = likedByMe ? "post-btn like-btn liked" : "post-btn like-btn";
      const likeIcon = likedByMe ? "❤️" : "🤍";
      const likeCountClass = post.likeCount > 0 ? "post-like-count has-likes" : "post-like-count";

      return `
        <article class="post-card" data-id="${post.id}">
          <header class="post-header">
            <img class="post-avatar" src="${escapeHtml(authorAvatar)}" alt="" />
            <div class="post-author-info">
              <div class="post-author-name">${escapeHtml(authorName)}</div>
              <div class="post-time">${timeAgo(post.created_at)}</div>
            </div>
            ${canDelete ? `<button class="post-more delete-btn" title="${t("post.delete_title")}">⋯</button>` : ""}
          </header>
          <div class="post-body">${escapeHtml(post.content)}</div>
          <footer class="post-footer">
            <div class="${likeCountClass}" data-count="${post.likeCount}">
              ${post.likeCount > 0 ? "❤️ " + post.likeCount : ""}
            </div>
            <div class="post-actions">
              <button class="${likeClass}">${likeIcon} ${t("post.like")}</button>
              <button class="post-btn">💬 ${t("post.comment")}</button>
              <button class="post-btn">↗ ${t("post.share")}</button>
            </div>
          </footer>
        </article>
      `;
    }

    async function loadFeed() {
      // Lấy posts kèm author (profiles) và likes
      const { data, error } = await supabaseClient
        .from("posts")
        .select(
          `
            id, content, created_at, author_id,
            author:profiles!posts_author_id_fkey(username, full_name, avatar_url),
            likes(user_id)
          `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[loadFeed]", error);
        postsContainer.innerHTML = `<p style="text-align:center;color:#dc2626;padding:24px">${t("err.post_load_error")}: ${error.message}</p>`;
        return;
      }

      if (!data || data.length === 0) {
        postsContainer.innerHTML =
          `<p style="text-align:center;color:#6b7280;padding:24px">${t("msg.no_posts")}</p>`;
        return;
      }

      // Tính likeCount + likedByMe cho mỗi post
      const enriched = data.map((p) => ({
        ...p,
        likeCount: (p.likes || []).length,
        likedByMe: (p.likes || []).some((l) => l.user_id === currentUserId),
      }));

      postsContainer.innerHTML = enriched.map(renderPost).join("");
    }

    // Composer submit
    const composerForm = document.getElementById("composerForm");
    const composerInput = document.getElementById("composerInput");
    const composerCharCount = document.getElementById("composerCharCount");
    const composerSubmit = document.getElementById("composerSubmit");

    composerInput?.addEventListener("input", () => {
      composerCharCount.textContent = composerInput.value.length + " / 1000";
    });

    composerForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = composerInput.value.trim();
      if (!content) return;
      if (content.length > 1000) {
        alert(t("err.post_max_chars"));
        return;
      }

      setLoading(composerSubmit, true);
      const { error } = await supabaseClient
        .from("posts")
        .insert({ author_id: currentUserId, content });
      setLoading(composerSubmit, false);

      if (error) {
        alert(t("err.post_error") + ": " + error.message);
        return;
      }

      composerInput.value = "";
      composerCharCount.textContent = "0 / 1000";
      loadFeed(); // reload toàn bộ feed (đơn giản nhất, fast với 50 post)
    });

    // Event delegation cho like / delete
    postsContainer?.addEventListener("click", async (e) => {
      const article = e.target.closest("article.post-card");
      if (!article) return;
      const postId = article.dataset.id;

      if (e.target.closest(".like-btn")) {
        const btn = e.target.closest(".like-btn");
        const countEl = article.querySelector(".post-like-count");
        const isLiked = btn.classList.contains("liked");
        const currentCount = parseInt(countEl.dataset.count || "0");

        if (isLiked) {
          const { error } = await supabaseClient
            .from("likes").delete().match({ post_id: postId, user_id: currentUserId });
          if (error) return console.error(error);
          btn.classList.remove("liked");
          btn.innerHTML = `🤍 ${t("post.like")}`;
          const newCount = Math.max(0, currentCount - 1);
          countEl.dataset.count = newCount;
          countEl.classList.toggle("has-likes", newCount > 0);
          countEl.textContent = newCount > 0 ? "❤️ " + newCount : "";
        } else {
          const { error } = await supabaseClient
            .from("likes").insert({ post_id: postId, user_id: currentUserId });
          if (error) return console.error(error);
          btn.classList.add("liked");
          btn.innerHTML = `❤️ ${t("post.like")}`;
          const newCount = currentCount + 1;
          countEl.dataset.count = newCount;
          countEl.classList.add("has-likes");
          countEl.textContent = "❤️ " + newCount;
        }
        return;
      }

      if (e.target.closest(".delete-btn")) {
        if (!confirm(t("msg.confirm_delete"))) return;
        const { error } = await supabaseClient
          .from("posts").delete().eq("id", postId);
        if (error) return alert(t("err.delete_error") + ": " + error.message);
        article.remove();
      }
    });

    loadFeed();

    // Load friends sidebar
    const friendsList = document.getElementById("friendsList");
    if (friendsList) {
      const { data: friends } = await supabaseClient
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .neq("id", currentUserId)
        .limit(10);

      if (!friends || friends.length === 0) {
        friendsList.innerHTML = `<p class="friends-empty">Chưa có bạn bè nào.<br/>Tính năng kết bạn sắp ra mắt!</p>`;
      } else {
        friendsList.innerHTML = friends.map((f) => {
          const name = f.full_name || f.username || t("post.unknown_user");
          const avatar = f.avatar_url || getDefaultAvatarUrl(name);
          return `<a href="#" class="friend-item">
            <img src="${escapeHtml(avatar)}" alt="" />
            <span>${escapeHtml(name)}</span>
          </a>`;
        }).join("");
      }
    }

    // Locket tab placeholder
    document.getElementById("locketTab")?.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Locket – Tính năng sắp ra mắt! 📸");
    });
  })();
}

// ============================================================
//  PROFILE PAGE — xem & sửa profile + upload avatar
// ============================================================
const profileRoot = document.getElementById("profileRoot");
if (profileRoot) {
  (async () => {
    const session = await requireSession();
    if (!session) return;

    const user = session.user;
    let profile = await fetchProfile(user.id);

    // Trường hợp hiếm: trigger chưa chạy → tự tạo profile rỗng
    if (!profile) {
      const { data: created } = await supabaseClient
        .from("profiles")
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
        })
        .select()
        .single();
      profile = created || {};
    }

    // Đổ data vào form
    const fullName = profile.full_name || "";
    document.getElementById("fullName").value = fullName;
    document.getElementById("username").value = profile.username || "";
    document.getElementById("bio").value = profile.bio || "";
    document.getElementById("school").value = profile.school || "";
    document.getElementById("class").value = profile.class || "";
    document.getElementById("bioCount").textContent = (
      profile.bio || ""
    ).length;
    document.getElementById("profileAvatar").src =
      profile.avatar_url || getDefaultAvatarUrl(fullName);

    profileRoot.classList.remove("hidden");

    // Đếm ký tự bio realtime
    const bioInput = document.getElementById("bio");
    bioInput.addEventListener("input", () => {
      document.getElementById("bioCount").textContent = bioInput.value.length;
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

    // Upload avatar
    const avatarInput = document.getElementById("avatarInput");
    const avatarImg = document.getElementById("profileAvatar");
    const avatarHint = document.getElementById("avatarHint");

    avatarInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        avatarHint.textContent = t("profile.avatar_size_error");
        avatarHint.style.color = "var(--error)";
        avatarInput.value = "";
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        avatarHint.textContent = t("profile.avatar_type_error");
        avatarHint.style.color = "var(--error)";
        avatarInput.value = "";
        return;
      }

      avatarHint.textContent = t("profile.avatar_uploading");
      avatarHint.style.color = "var(--text-light)";

      const ext = file.name.split(".").pop().toLowerCase();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error(uploadError);
        avatarHint.textContent = t("profile.avatar_upload_error") + ": " + uploadError.message;
        avatarHint.style.color = "var(--error)";
        return;
      }

      const { data: urlData } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        avatarHint.textContent = t("profile.avatar_url_error") + ": " + updateError.message;
        avatarHint.style.color = "var(--error)";
        return;
      }

      avatarImg.src = publicUrl;
      avatarHint.textContent = t("profile.avatar_success");
      avatarHint.style.color = "var(--primary)";
    });

    // Submit form text fields
    const profileForm = document.getElementById("profileForm");
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newFullName = document.getElementById("fullName").value.trim();
      const newUsername = document
        .getElementById("username")
        .value.trim()
        .toLowerCase();
      const newBio = document.getElementById("bio").value.trim();
      const newSchool = document.getElementById("school").value.trim();
      const newClass = document.getElementById("class").value.trim();
      const submitBtn = profileForm.querySelector("button[type=submit]");

      clearError("fullName");
      clearError("username");

      let valid = true;
      if (!newFullName || newFullName.length < 2) {
        showError("fullName", t("err.fullname_min2"));
        valid = false;
      }
      if (newUsername && !/^[a-z0-9_]{3,30}$/.test(newUsername)) {
        showError("username", t("err.username_format"));
        valid = false;
      }
      if (!valid) return;

      setLoading(submitBtn, true);
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: newFullName,
          username: newUsername || null,
          bio: newBio || null,
          school: newSchool || null,
          class: newClass || null,
        })
        .eq("id", user.id);
      setLoading(submitBtn, false);

      if (updateError) {
        if (updateError.code === "23505") {
          showError("username", t("err.username_taken"));
        } else {
          showFeedback("Lỗi: " + updateError.message, "error");
        }
        return;
      }

      showFeedback(t("msg.profile_saved"), "success");
    });
  })();
}

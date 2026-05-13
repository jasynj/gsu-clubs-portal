// Shared auth module: sessionStorage-backed JWT session for the GSU Clubs Portal.
// Loaded as a non-module script before page-specific scripts.

(function () {
  const SESSION_KEY = "gsu_session";

  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === ""
      ? "http://localhost:3001"
      : "https://gsu-clubs-portal-50tdlfgdb-jasynjs-projects.vercel.app";

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function getRole() {
    return getSession()?.role || null;
  }

  function getOrgSlug() {
    return getSession()?.orgSlug || null;
  }

  function getOrgName() {
    return getSession()?.orgName || null;
  }

  function getDisplayName() {
    const s = getSession();
    if (!s) return null;
    if (s.role === "super_admin") return "Admin";
    return s.orgName || s.orgSlug || "Signed in";
  }

  async function authFetch(url, options = {}) {
    const session = getSession();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }

  // Try org login first (slug + password), fall back to admin login (admin + password).
  // Returns { ok: true } on success, { ok: false, error } otherwise.
  async function login(usernameRaw, password) {
    const username = String(usernameRaw || "").trim();
    if (!username || !password) {
      return { ok: false, error: "Username and password are required." };
    }

    const slug = slugify(username);
    if (slug) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/org-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, password }),
        });
        if (res.ok) {
          const data = await res.json();
          setSession({
            token: data.token,
            role: "org_admin",
            orgId: data.org?.id || null,
            orgSlug: data.org?.slug || slug,
            orgName: data.org?.name || username,
          });
          return { ok: true };
        }
      } catch {
        // fall through to admin attempt
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession({
          token: data.token,
          role: "super_admin",
          orgId: null,
          orgSlug: null,
          orgName: "Admin",
        });
        return { ok: true };
      }
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }

    return { ok: false, error: "Invalid username or password." };
  }

  function logout() {
    clearSession();
  }

  // ---------- Header UI + Sign-in modal ----------

  const MODAL_HTML = `
    <div class="signin-modal" id="signinModal" hidden>
      <div class="signin-modal__backdrop" data-signin-close="true"></div>
      <div class="signin-modal__card" role="dialog" aria-modal="true" aria-labelledby="signinModalTitle">
        <h2 id="signinModalTitle">Sign In</h2>
        <p>Organization presidents and admins can sign in to manage documents.</p>
        <form id="signinForm">
          <label class="signin-modal__field">
            <span>Username</span>
            <input id="signinUsername" type="text" required autocomplete="username" placeholder="Organization name or 'admin'" />
          </label>
          <label class="signin-modal__field">
            <span>Password</span>
            <input id="signinPassword" type="password" required autocomplete="current-password" />
          </label>
          <p class="signin-modal__error" id="signinError" aria-live="polite"></p>
          <div class="signin-modal__buttons">
            <button type="submit" class="signin-modal__submit">Sign In</button>
            <button type="button" class="signin-modal__cancel" data-signin-close="true">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  function renderHeaderSlot(slot) {
    if (!slot) return;
    const session = getSession();
    if (session) {
      slot.innerHTML = `
        <span class="header__user" title="${escapeAttr(getDisplayName())}">${escapeHtml(getDisplayName())}</span>
        <button type="button" class="header__signout" id="signOutBtn">Sign Out</button>
      `;
      const out = slot.querySelector("#signOutBtn");
      if (out) out.addEventListener("click", () => {
        logout();
        window.location.reload();
      });
    } else {
      slot.innerHTML = `<button type="button" class="header__signin" id="signInBtn">Sign In</button>`;
      const btn = slot.querySelector("#signInBtn");
      if (btn) btn.addEventListener("click", openSigninModal);
    }
  }

  function ensureModal() {
    let modal = document.getElementById("signinModal");
    if (!modal) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = MODAL_HTML.trim();
      modal = wrapper.firstChild;
      document.body.appendChild(modal);
    }
    return modal;
  }

  function openSigninModal() {
    const modal = ensureModal();
    modal.hidden = false;
    const userField = document.getElementById("signinUsername");
    if (userField) userField.focus();

    modal.querySelectorAll("[data-signin-close]").forEach((el) =>
      el.addEventListener("click", closeSigninModal, { once: true })
    );

    const form = document.getElementById("signinForm");
    if (form && !form.dataset.bound) {
      form.dataset.bound = "1";
      form.addEventListener("submit", handleSigninSubmit);
    }
  }

  function closeSigninModal() {
    const modal = document.getElementById("signinModal");
    if (modal) modal.hidden = true;
    const err = document.getElementById("signinError");
    if (err) err.textContent = "";
  }

  async function handleSigninSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("signinUsername").value;
    const password = document.getElementById("signinPassword").value;
    const errEl = document.getElementById("signinError");
    const submitBtn = e.target.querySelector(".signin-modal__submit");
    if (submitBtn) submitBtn.disabled = true;
    errEl.textContent = "";

    const result = await login(username, password);
    if (submitBtn) submitBtn.disabled = false;

    if (result.ok) {
      window.location.reload();
    } else {
      errEl.textContent = result.error || "Invalid credentials.";
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function mountHeaderUI() {
    const slot = document.querySelector("[data-auth-slot]");
    renderHeaderSlot(slot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountHeaderUI);
  } else {
    mountHeaderUI();
  }

  window.GSUAuth = {
    API_BASE,
    slugify,
    getSession,
    setSession,
    clearSession,
    isLoggedIn,
    getRole,
    getOrgSlug,
    getOrgName,
    getDisplayName,
    authFetch,
    login,
    logout,
    openSigninModal,
    closeSigninModal,
  };
})();

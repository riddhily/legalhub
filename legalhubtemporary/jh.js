/* JusticeHub – shared app logic (API-backed version) */

const JH_API = "http://localhost:5000/api";

/* ── Token helpers ── */
function jhGetToken() { return localStorage.getItem("jh_token"); }
function jhSetToken(t) { localStorage.setItem("jh_token", t); }
function jhRemoveToken() { localStorage.removeItem("jh_token"); }

function jhGetCurrentUser() {
  try { return JSON.parse(localStorage.getItem("jh_current_user")); }
  catch { return null; }
}
function jhSetCurrentUser(u) { localStorage.setItem("jh_current_user", JSON.stringify(u)); }
function jhLogout() { jhRemoveToken(); localStorage.removeItem("jh_current_user"); }

/* ── Generic fetch wrapper ── */
async function jhFetch(path, opts = {}) {
  const token = jhGetToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${JH_API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

/* ── Seed (call once on first load) ── */
async function jhSeed() {
  try { await jhFetch("/firms/seed", { method: "POST" }); } catch {}
}

/* ── Auth guards ── */
function jhRequireAuth(redirectTo = "auth.html") {
  const user = jhGetCurrentUser();
  if (!user) { window.location.href = redirectTo; return null; }
  return user;
}

function jhRequireRole(allowedRoles) {
  const user = jhGetCurrentUser();
  if (!user) { window.location.href = "auth.html"; return null; }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = "index.html"; return null;
  }
  return user;
}

/* ── Data loaders (async) ── */
async function jhLoadInternships(query = {}) {
  const qs = new URLSearchParams({ type: "internship", ...query }).toString();
  return jhFetch(`/opportunities?${qs}`);
}

async function jhLoadJobs(query = {}) {
  const qs = new URLSearchParams({ type: "job", ...query }).toString();
  return jhFetch(`/opportunities?${qs}`);
}

async function jhLoadFirms() { return jhFetch("/firms"); }
async function jhLoadKnowledge() { return jhFetch("/knowledge"); }
async function jhLoadApplications() { return jhFetch("/student/applications"); }
async function jhLoadSaved() { return jhFetch("/student/saved"); }
async function jhLoadRecruiterApps() { return jhFetch("/recruiter/applications"); }

/* ── Actions ── */
async function jhApply(type, listingId) {
  return jhFetch("/student/apply", { method: "POST", body: JSON.stringify({ type, listingId }) });
}

async function jhSaveOpp(id, type) {
  return jhFetch("/student/save", { method: "POST", body: JSON.stringify({ id, type }) });
}

async function jhUnsaveOpp(id, type) {
  return jhFetch("/student/unsave", { method: "POST", body: JSON.stringify({ id, type }) });
}

async function jhPostOpportunity(data) {
  return jhFetch("/opportunities", { method: "POST", body: JSON.stringify(data) });
}

async function jhUpdateAppStatus(appId, status) {
  return jhFetch(`/recruiter/applications/${appId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

/* ── Formatters (unchanged) ── */
function jhFormatMoneyINR(amount) {
  if (!amount) return "₹0";
  try { return amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }); }
  catch { return `₹${amount}`; }
}

function jhFormatStipend(min, max) {
  if (!min && !max) return "Unpaid";
  if (min === max) return jhFormatMoneyINR(min) + " / month";
  return `${jhFormatMoneyINR(min)} – ${jhFormatMoneyINR(max)} / month`;
}

function jhFormatSalary(min, max) {
  if (!min && !max) return "Not specified";
  if (min === max) return jhFormatMoneyINR(min) + " / year";
  return `${jhFormatMoneyINR(min)} – ${jhFormatMoneyINR(max)} / year`;
}

function jhStatusOptions() {
  return ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];
}

/* ── Nav Mount ── */
function jhInitTheme() {
  const saved = localStorage.getItem("jh_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  return saved;
}

function jhSetTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("jh_theme", next);
}

function jhMountNav() {
  const currentTheme = jhInitTheme();
  const navLinks = document.querySelector(".nav-links");
  const toggle = document.querySelector(".nav-toggle");
  if (toggle && navLinks) {
    toggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  }

  const user = jhGetCurrentUser();
  const slot = document.getElementById("nav-auth-slot");
  if (!slot || !navLinks) return;

  if (!user) {
    slot.innerHTML = `<a class="cta" href="auth.html">Login / Signup</a>`;
  } else {
    const dash = user.role === "student"
      ? "student-dashboard.html"
      : user.role === "recruiter"
        ? "recruiter-dashboard.html"
        : user.role === "admin"
          ? "admin.html"
          : "index.html";

    slot.innerHTML = `
      <a href="${dash}" class="cta">Dashboard</a>
      <button id="btn-logout" class="cta" type="button">Logout</button>
    `;

    const btn = document.getElementById("btn-logout");
    if (btn) {
      btn.addEventListener("click", () => {
        jhLogout();
        window.location.href = "auth.html";
      });
    }
  }

  const themeBtn = document.createElement("button");
  themeBtn.type = "button";
  themeBtn.className = "theme-toggle";
  themeBtn.textContent = currentTheme === "light" ? "☀" : "🌙";
  themeBtn.title = "Toggle light / dark theme";
  navLinks.appendChild(themeBtn);

  themeBtn.addEventListener("click", () => {
    const now = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = now === "light" ? "dark" : "light";
    jhSetTheme(next);
    themeBtn.textContent = next === "light" ? "☀" : "🌙";
  });
}

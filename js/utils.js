/* ============================================================
   utils.js — Shared helpers used across all pages
   ============================================================ */

function ltPeso(n) {
  if (!isFinite(n)) n = 0;
  return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ltPesoCompact(n) {
  if (!isFinite(n)) n = 0;
  n = Number(n);
  if (Math.abs(n) >= 1000000) return "₱" + (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return "₱" + (n / 1000).toFixed(0) + "K";
  return ltPeso(n);
}

function ltFormatDate(iso, opts) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", opts || { year: "numeric", month: "short", day: "numeric" });
}

function ltFormatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) + " · " +
         d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

function ltTimeAgo(iso) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return ltFormatDate(iso);
}

function ltEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function ltDebounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ---------- Toast ---------- */
let ltToastTimer;
function ltToast(msg, icon) {
  let t = document.getElementById("ltToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "ltToast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = (icon || "✔") + " " + msg;
  t.classList.add("show");
  clearTimeout(ltToastTimer);
  ltToastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- Theme ---------- */
function ltApplyTheme(theme) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  return isDark;
}

function ltInitTheme() {
  const data = ltLoad();
  const isDark = ltApplyTheme(data.settings.theme || "system");
  ltUpdateThemeIcons(isDark);
}

function ltUpdateThemeIcons(isDark) {
  document.querySelectorAll(".theme-icon").forEach(el => el.textContent = isDark ? "☀️" : "🌙");
}

function ltToggleTheme() {
  const data = ltLoad();
  const current = data.settings.theme || "system";
  // cycle: system -> light -> dark -> system, but for a simple navbar toggle we just flip dark/light
  const currentlyDark = document.documentElement.classList.contains("dark");
  const next = currentlyDark ? "light" : "dark";
  data.settings.theme = next;
  ltSave(data);
  const isDark = ltApplyTheme(next);
  ltUpdateThemeIcons(isDark);
}

/* ---------- Branding (apply company name / logo across pages) ---------- */
function ltApplyBranding() {
  const data = ltLoad();
  document.querySelectorAll(".company-name-label").forEach(el => el.textContent = data.settings.companyName || "Loan Officer Toolkit");
  if (data.settings.companyLogo) {
    document.querySelectorAll(".company-logo-img").forEach(el => el.src = data.settings.companyLogo);
  }
}

/* ---------- Tabs (generic) ---------- */
function ltInitTabs(container) {
  const tabs = container.querySelectorAll(".tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      container.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
      container.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.dataset.tabPanel === target));
    });
  });
}

/* ============================================================
   navbar.js — Injects the shared top navbar into #navbar-root
   ============================================================ */

function ltRenderNavbar(active) {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  const pages = [
    { id: "dashboard",  href: "index.html",      icon: "🏠", label: "Dashboard" },
    { id: "calculator", href: "calculator.html", icon: "🧮", label: "Loan Calculator" },
    { id: "checklist",  href: "checklist.html",  icon: "📋", label: "Requirements Checklist" },
    { id: "clients",    href: "clients.html",    icon: "👥", label: "Client Manager" },
    { id: "reports",    href: "reports.html",    icon: "📄", label: "Reports" },
    { id: "settings",   href: "settings.html",   icon: "⚙",  label: "Settings" }
  ];

  const data = ltLoad();

  root.innerHTML = `
    <nav class="navbar no-print">
      <div class="navbar-brand">
        <img src="assets/logo.png" alt="Company logo" class="navbar-logo company-logo-img" id="navbarLogo">
        <span class="company-name-label">${ltEscapeHtml(data.settings.companyName || "Loan Officer Toolkit")}</span>
      </div>
      <button class="navbar-toggle" id="navToggle" aria-label="Toggle menu">☰</button>
      <div class="navbar-links" id="navLinks">
        ${pages.map(p => `<a href="${p.href}" class="nav-link ${p.id === active ? "active" : ""}"><span class="nav-icon">${p.icon}</span>${p.label}</a>`).join("")}
        <button class="btn btn-icon navbar-dark" id="darkToggleNav" title="Toggle dark mode"><span class="theme-icon">🌙</span></button>
      </div>
    </nav>
  `;

  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (navToggle) navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));

  const darkBtn = document.getElementById("darkToggleNav");
  if (darkBtn) darkBtn.addEventListener("click", ltToggleTheme);
}

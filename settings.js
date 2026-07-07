(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("settings");
  ltApplyBranding();

  const $ = (id) => document.getElementById(id);
  let data = ltLoad();

  function loadForm() {
    data = ltLoad();
    $("setCompanyName").value = data.settings.companyName || "";
    $("setCompanyPrefix").value = data.settings.companyPrefix || "ESQ";
    $("setInterest").value = data.settings.interestDefault;
    $("setFee").value = data.settings.serviceFeeDefault;
    $("setTheme").value = data.settings.theme || "system";
    if (data.settings.companyLogo) $("logoPreview").src = data.settings.companyLogo;
    $("aboutClients").textContent = data.clients.length;
    const bytes = new Blob([localStorage.getItem(LT_KEY) || ""]).size;
    $("aboutStorage").textContent = (bytes / 1024).toFixed(1) + " KB";
  }

  function saveForm(showToast) {
    data = ltLoad();
    data.settings.companyName = $("setCompanyName").value.trim() || "Loan Officer Toolkit";
    data.settings.companyPrefix = ($("setCompanyPrefix").value.trim() || "ESQ").toUpperCase();
    data.settings.interestDefault = parseFloat($("setInterest").value) || 0;
    data.settings.serviceFeeDefault = parseFloat($("setFee").value) || 0;
    data.settings.theme = $("setTheme").value;
    data.settings.currency = "PHP";
    ltSave(data);
    ltApplyBranding();
    const isDark = ltApplyTheme(data.settings.theme);
    ltUpdateThemeIcons(isDark);
    if (showToast) ltToast("Settings saved", "💾");
  }

  const debouncedSave = ltDebounce(() => saveForm(true), 500);
  ["setCompanyName", "setCompanyPrefix", "setInterest", "setFee"].forEach(id => {
    $(id).addEventListener("input", debouncedSave);
  });
  $("setTheme").addEventListener("change", () => saveForm(true));
  $("saveSettingsBtn").addEventListener("click", () => saveForm(true));

  $("logoInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { ltToast("Logo must be under 1MB", "⚠"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      $("logoPreview").src = reader.result;
      data = ltLoad();
      data.settings.companyLogo = reader.result;
      ltSave(data);
      ltApplyBranding();
      ltToast("Logo updated", "✔");
    };
    reader.readAsDataURL(file);
  });

  $("resetLogoBtn").addEventListener("click", () => {
    data = ltLoad();
    data.settings.companyLogo = "";
    ltSave(data);
    $("logoPreview").src = "assets/logo.png";
    document.querySelectorAll(".company-logo-img").forEach(el => el.src = "assets/logo.png");
    ltToast("Logo reset to default", "↺");
  });

  loadForm();
})();

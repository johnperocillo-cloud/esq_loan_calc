(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("reports");
  ltApplyBranding();

  const $ = (id) => document.getElementById(id);
  const data = ltLoad();
  const clients = data.clients;

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  const colors = {
    primary: cssVar("--primary"), accent: cssVar("--accent"), info: cssVar("--info"),
    success: cssVar("--success"), warning: cssVar("--warning"), danger: cssVar("--danger"),
    ink: cssVar("--ink"), inkMuted: cssVar("--ink-muted"), line: cssVar("--line")
  };
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = colors.inkMuted;
  Chart.defaults.borderColor = colors.line;

  /* ---------- Summary stats ---------- */
  const total = clients.length;
  const completed = clients.filter(c => c.status === "completed").length;
  const avgCompletion = total ? Math.round(clients.reduce((s, c) => s + ltComputeProgress(c).pct, 0) / total) : 0;
  const totalLoanValue = clients.reduce((s, c) => s + (Number(c.loanAmount) || 0), 0);

  $("reportStats").innerHTML = `
    <div class="stat-card tone-accent"><div class="label">Total Clients</div><div class="value">${total}</div></div>
    <div class="stat-card tone-success"><div class="label">Completed</div><div class="value">${completed}</div></div>
    <div class="stat-card"><div class="label">Avg. Completion</div><div class="value">${avgCompletion}%</div></div>
    <div class="stat-card tone-info"><div class="label">Total Loan Value</div><div class="value" style="font-size:20px;">${ltPeso(totalLoanValue)}</div></div>
  `;

  if (total === 0) {
    document.querySelectorAll(".chart-card").forEach(c => c.innerHTML += `<p class="muted" style="margin-top:10px; font-size:12.5px;">No client data yet.</p>`);
  }

  /* ---------- Chart 1: Applications by Status ---------- */
  const statusCounts = { pending: 0, "in-progress": 0, completed: 0, cancelled: 0 };
  clients.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  new Chart($("chartStatus"), {
    type: "doughnut",
    data: {
      labels: ["Pending", "In Progress", "Completed", "Cancelled"],
      datasets: [{ data: [statusCounts.pending, statusCounts["in-progress"], statusCounts.completed, statusCounts.cancelled],
        backgroundColor: [colors.inkMuted, colors.info, colors.success, colors.danger], borderWidth: 0 }]
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } } } }
  });

  /* ---------- Chart 2: Loan Types ---------- */
  const typeCounts = { new: 0, additional: 0, reloan: 0 };
  clients.forEach(c => { typeCounts[c.loanType] = (typeCounts[c.loanType] || 0) + 1; });
  new Chart($("chartLoanTypes"), {
    type: "pie",
    data: {
      labels: ["New Client", "Additional Loan", "Re-loan"],
      datasets: [{ data: [typeCounts.new, typeCounts.additional, typeCounts.reloan],
        backgroundColor: [colors.accent, colors.primary, colors.info], borderWidth: 0 }]
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } } } }
  });

  /* ---------- Chart 3: Completion % Distribution ---------- */
  const buckets = [0, 0, 0, 0]; // 0-25, 26-50, 51-75, 76-100
  clients.forEach(c => {
    const pct = ltComputeProgress(c).pct;
    if (pct <= 25) buckets[0]++; else if (pct <= 50) buckets[1]++; else if (pct <= 75) buckets[2]++; else buckets[3]++;
  });
  new Chart($("chartCompletion"), {
    type: "bar",
    data: {
      labels: ["0–25%", "26–50%", "51–75%", "76–100%"],
      datasets: [{ label: "Clients", data: buckets, backgroundColor: colors.accent, borderRadius: 6, maxBarThickness: 40 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
  });

  /* ---------- Chart 4: Monthly Clients (last 6 months) ---------- */
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" }), key: `${d.getFullYear()}-${d.getMonth()}` });
  }
  const monthCounts = months.map(m => clients.filter(c => {
    const d = new Date(c.dateCreated);
    return `${d.getFullYear()}-${d.getMonth()}` === m.key;
  }).length);
  new Chart($("chartMonthly"), {
    type: "line",
    data: { labels: months.map(m => m.label), datasets: [{ label: "New Clients", data: monthCounts, borderColor: colors.primary, backgroundColor: colors.primary, tension: 0.35, fill: false, pointRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
  });

  /* ---------- Chart 5: Pending Documents by Section ---------- */
  const sectionPending = {};
  CHECKLIST_SCHEMA.forEach(sec => sectionPending[sec.key] = 0);
  clients.forEach(c => {
    ltVisibleItems(c).forEach(it => {
      const st = ltGetItemState(c, it.section, it.key).status;
      if (st === "pending" || st === "rejected") sectionPending[it.section]++;
    });
  });
  new Chart($("chartPendingDocs"), {
    type: "bar",
    data: {
      labels: CHECKLIST_SCHEMA.map(s => s.label),
      datasets: [{ label: "Pending / Rejected Items", data: CHECKLIST_SCHEMA.map(s => sectionPending[s.key]), backgroundColor: colors.warning, borderRadius: 6, maxBarThickness: 46 }]
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } }
  });

  /* ---------- Export ---------- */
  $("exportClientSelect").innerHTML = clients.map(c => `<option value="${c.id}">${ltEscapeHtml(c.applicantName)} — ${c.id}</option>`).join("") || `<option value="">No clients</option>`;

  $("exportSingleBtn").addEventListener("click", () => {
    const id = $("exportClientSelect").value;
    const c = ltGetClient(data, id);
    if (!c) { ltToast("No client selected", "⚠"); return; }
    ltDownloadClientPDF(c, data.settings.companyName);
    ltToast("PDF exported", "⇩");
  });

  $("exportAllPdfBtn").addEventListener("click", () => {
    if (clients.length === 0) { ltToast("No clients to export", "⚠"); return; }
    ltDownloadAllClientsPDF(clients, data.settings.companyName);
    ltToast("All clients exported as PDF", "⇩");
  });

  $("exportAllJsonBtn").addEventListener("click", () => {
    ltDownloadJSON(clients, "all_clients.json");
    ltToast("All clients exported as JSON", "⇩");
  });

  $("exportAllCsvBtn").addEventListener("click", () => {
    ltDownloadCSV(ltClientsToCSV(clients), "all_clients.csv");
    ltToast("All clients exported as CSV", "⇩");
  });

  /* ---------- Backup / Restore ---------- */
  $("backupBtn").addEventListener("click", () => { ltCreateBackup(data); ltToast("Backup created", "💾"); });

  $("restoreInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Restoring will replace all current data in this browser. Continue?")) { e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        ltRestoreBackup(data, reader.result);
        ltToast("Backup restored — reloading…", "✔");
        setTimeout(() => location.reload(), 900);
      } catch (err) {
        ltToast("Invalid backup file", "⚠");
      }
    };
    reader.readAsText(file);
  });
})();

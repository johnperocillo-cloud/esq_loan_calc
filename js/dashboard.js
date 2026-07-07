(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("dashboard");
  ltApplyBranding();

  document.getElementById("heroDate").textContent =
    new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const data = ltLoad();
  const clients = data.clients;

  function statusBadge(status) {
    const meta = LT_CLIENT_STATUS_META[status] || LT_CLIENT_STATUS_META.pending;
    return `<span class="badge ${meta.badge}"><span class="badge-dot"></span>${meta.label}</span>`;
  }

  // ---------- Primary stats ----------
  const total = clients.length;
  const completed = clients.filter(c => c.status === "completed").length;
  const pending = clients.filter(c => c.status === "pending" || c.status === "in-progress").length;
  const avgCompletion = total ? Math.round(clients.reduce((sum, c) => sum + ltComputeProgress(c).pct, 0) / total) : 0;

  document.getElementById("statTotalClients").textContent = total;
  document.getElementById("statCompleted").textContent = completed;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statAvgCompletion").textContent = avgCompletion + "%";

  // ---------- Recent clients (5 most recent) ----------
  const recent = [...clients].sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)).slice(0, 5);
  const body = document.getElementById("recentClientsBody");
  if (recent.length === 0) {
    document.getElementById("recentClientsTable").style.display = "none";
    document.getElementById("recentClientsEmpty").style.display = "block";
  } else {
    body.innerHTML = recent.map(c => {
      const pct = ltComputeProgress(c).pct;
      return `<tr onclick="location.href='clients.html?open=${encodeURIComponent(c.id)}'" style="cursor:pointer;">
        <td class="mono">${c.id}</td>
        <td>${ltEscapeHtml(c.applicantName)}</td>
        <td class="mono">${ltPeso(c.loanAmount)}</td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <div class="progress-label"><span>${pct}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
        </td>
      </tr>`;
    }).join("");
  }

  // ---------- Recent activity ----------
  const activityList = document.getElementById("activityList");
  if (data.activity.length === 0) {
    document.getElementById("activityEmpty").style.display = "block";
  } else {
    activityList.innerHTML = data.activity.slice(0, 10).map(a =>
      `<li><span>${a.icon || "✔"} ${ltEscapeHtml(a.text)}</span><span class="a-time">${ltTimeAgo(a.date)}</span></li>`
    ).join("");
  }

  // ---------- Widgets ----------
  const todayStr = new Date().toDateString();
  const todayClients = clients.filter(c => new Date(c.dateCreated).toDateString() === todayStr).length;
  const pendingDocs = clients.reduce((sum, c) => sum + ltComputeProgress(c).missing, 0);

  document.getElementById("widgetTodayClients").textContent = todayClients;
  document.getElementById("widgetPendingDocs").textContent = pendingDocs;
  document.getElementById("widgetCompletedApps").textContent = completed;

  const avgLoan = total ? clients.reduce((sum, c) => sum + (Number(c.loanAmount) || 0), 0) / total : 0;
  const largestLoan = total ? Math.max(...clients.map(c => Number(c.loanAmount) || 0)) : 0;

  const typeCounts = {};
  clients.forEach(c => { typeCounts[c.loanType] = (typeCounts[c.loanType] || 0) + 1; });
  let commonType = "—";
  let maxCount = 0;
  Object.keys(typeCounts).forEach(t => { if (typeCounts[t] > maxCount) { maxCount = typeCounts[t]; commonType = LT_LOAN_TYPE_META[t] || t; } });

  document.getElementById("widgetAvgLoan").textContent = ltPeso(avgLoan);
  document.getElementById("widgetLargestLoan").textContent = ltPeso(largestLoan);
  document.getElementById("widgetCommonType").textContent = commonType;

  // ---------- Recently modified ----------
  const modified = [...clients].sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified)).slice(0, 5);
  const modList = document.getElementById("recentlyModifiedList");
  if (modified.length === 0) {
    modList.innerHTML = `<li class="muted">No clients yet.</li>`;
  } else {
    modList.innerHTML = modified.map(c =>
      `<li><span>${ltEscapeHtml(c.applicantName)} <span class="mono muted">(${c.id})</span></span><span class="a-time">${ltTimeAgo(c.dateModified)}</span></li>`
    ).join("");
  }
})();

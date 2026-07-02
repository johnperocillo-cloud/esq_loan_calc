(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("clients");
  ltApplyBranding();

  const $ = (id) => document.getElementById(id);
  let data = ltLoad();
  let searchTerm = "";
  let statusFilter = "all";
  let activeClientId = null;

  function statusBadge(status) {
    const meta = LT_CLIENT_STATUS_META[status] || LT_CLIENT_STATUS_META.pending;
    return `<span class="badge ${meta.badge}"><span class="badge-dot"></span>${meta.label}</span>`;
  }

  /* ---------- Modal helpers ---------- */
  function openModal(id) { $(id).classList.add("show"); }
  function closeModal(id) { $(id).classList.remove("show"); }
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("show"); });
  });

  /* ---------- Table rendering ---------- */
  function matchesSearch(c, term) {
    if (!term) return true;
    const hay = [c.id, c.applicantName, c.contact, c.notes].join(" ").toLowerCase();
    return hay.includes(term);
  }

  function renderTable() {
    data = ltLoad();
    let list = data.clients.filter(c => matchesSearch(c, searchTerm.toLowerCase()));
    if (statusFilter !== "all") list = list.filter(c => c.status === statusFilter);
    list = [...list].sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    const body = $("clientsBody");
    if (list.length === 0) {
      $("clientsTable").style.display = "none";
      $("clientsEmpty").style.display = "block";
      return;
    }
    $("clientsTable").style.display = "table";
    $("clientsEmpty").style.display = "none";

    body.innerHTML = list.map(c => {
      const pct = ltComputeProgress(c).pct;
      return `<tr>
        <td class="mono">${c.id}</td>
        <td>${ltEscapeHtml(c.applicantName)}</td>
        <td class="mono">${ltPeso(c.loanAmount)}</td>
        <td>${LT_LOAN_TYPE_META[c.loanType] || c.loanType}</td>
        <td style="min-width:120px;">
          <div class="progress-label"><span>${pct}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
        </td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-sm" data-action="open" data-id="${c.id}">Open</button>
            <button class="btn btn-sm" data-action="edit" data-id="${c.id}">Edit</button>
            <button class="btn btn-sm" data-action="duplicate" data-id="${c.id}">⧉</button>
            <button class="btn btn-sm" data-action="pdf" data-id="${c.id}">⇩ PDF</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${c.id}">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    body.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleRowAction(btn.dataset.action, btn.dataset.id));
    });
  }

  function handleRowAction(action, id) {
    data = ltLoad();
    const client = ltGetClient(data, id);
    if (!client) return;
    if (action === "open") openProfile(id);
    else if (action === "edit") openClientForm(client);
    else if (action === "duplicate") { ltDuplicateClient(data, id); renderTable(); ltToast("Client duplicated", "⧉"); }
    else if (action === "pdf") { ltDownloadClientPDF(client, data.settings.companyName); ltToast("PDF downloaded", "⇩"); }
    else if (action === "delete") {
      if (confirm(`Delete ${client.applicantName} (${client.id})? This cannot be undone.`)) {
        ltDeleteClient(data, id); renderTable(); ltToast("Client deleted", "🗑");
      }
    }
  }

  /* ---------- Search & filters ---------- */
  $("searchInput").addEventListener("input", ltDebounce((e) => { searchTerm = e.target.value; renderTable(); }, 200));
  document.querySelectorAll("#statusChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#statusChips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      statusFilter = chip.dataset.status;
      renderTable();
    });
  });

  /* ---------- Add / Edit Client form ---------- */
  function resetClientForm() {
    $("cfId").value = ""; $("cfName").value = ""; $("cfContact").value = "";
    $("cfStatus").value = "pending"; $("cfAmount").value = 750000; $("cfTerm").value = 12;
    $("cfLoanType").value = "new"; $("cfBusinessType").value = "sole";
    data = ltLoad();
    $("cfInterest").value = data.settings.interestDefault || 3.5;
    $("cfFee").value = data.settings.serviceFeeDefault || 5;
    $("cfNotes").value = "";
    $("clientFormTitle").textContent = "New Client";
  }

  function openClientForm(client) {
    if (client) {
      $("clientFormTitle").textContent = "Edit Client — " + client.id;
      $("cfId").value = client.id;
      $("cfName").value = client.applicantName;
      $("cfContact").value = client.contact;
      $("cfStatus").value = client.status;
      $("cfAmount").value = client.loanAmount;
      $("cfTerm").value = client.loanTerm;
      $("cfLoanType").value = client.loanType;
      $("cfBusinessType").value = client.businessType;
      $("cfInterest").value = client.interestRate;
      $("cfFee").value = client.serviceFee;
      $("cfNotes").value = client.notes;
    } else {
      resetClientForm();
    }
    openModal("clientFormOverlay");
  }

  $("addClientBtn").addEventListener("click", () => openClientForm(null));
  $("emptyAddBtn").addEventListener("click", () => openClientForm(null));

  $("cfSaveBtn").addEventListener("click", () => {
    const name = $("cfName").value.trim();
    if (!name) { ltToast("Applicant name is required", "⚠"); return; }
    const amount = parseFloat($("cfAmount").value);
    if (!(amount > 0)) { ltToast("Loan amount must be greater than zero", "⚠"); return; }

    data = ltLoad();
    const fields = {
      applicantName: name,
      contact: $("cfContact").value.trim(),
      status: $("cfStatus").value,
      loanAmount: amount,
      loanTerm: parseFloat($("cfTerm").value) || 1,
      loanType: $("cfLoanType").value,
      businessType: $("cfBusinessType").value,
      interestRate: parseFloat($("cfInterest").value) || 0,
      serviceFee: parseFloat($("cfFee").value) || 0,
      notes: $("cfNotes").value
    };

    const existingId = $("cfId").value;
    if (existingId) {
      ltUpdateClient(data, existingId, fields, "Client details updated");
      ltToast("Client updated", "✔");
    } else {
      const c = ltNewClient(data, fields);
      ltToast(`Client ${c.id} added`, "✔");
    }
    closeModal("clientFormOverlay");
    renderTable();
  });

  /* ---------- Client profile ---------- */
  function openProfile(id) {
    data = ltLoad();
    const client = ltGetClient(data, id);
    if (!client) return;
    activeClientId = id;

    $("profileName").textContent = client.applicantName;
    $("profileId").textContent = client.id;

    ltRenderProgressTracker(client, $("progressTrackerBox"));
    $("pInfoName").textContent = client.applicantName;
    $("pInfoContact").textContent = client.contact || "—";
    $("pInfoId").textContent = client.id;
    $("pInfoDate").textContent = ltFormatDate(client.dateCreated);
    $("pInfoStatus").innerHTML = statusBadge(client.status);

    $("pLoanAmount").textContent = ltPeso(client.loanAmount);
    $("pLoanTerm").textContent = client.loanTerm + " months";
    $("pLoanType").textContent = LT_LOAN_TYPE_META[client.loanType] || client.loanType;
    $("pBusinessType").textContent = client.businessType === "corporation" ? "Corporation" : "Sole Proprietorship";
    $("pInterest").textContent = (client.interestRate || 0) + "% per month";
    $("pFee").textContent = (client.serviceFee || 0) + "%";

    $("pNotesArea").value = client.notes || "";

    renderProfileChecklist();
    renderHistory(client);

    // reset to first tab
    document.querySelectorAll("#profileTabs .tab-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
    document.querySelectorAll("#profileOverlay .tab-panel").forEach((p, i) => p.classList.toggle("active", i === 0));

    openModal("profileOverlay");
  }

  function renderProfileChecklist() {
    data = ltLoad();
    const client = ltGetClient(data, activeClientId);
    if (!client) return;
    ltRenderChecklistUI($("profileChecklistContainer"), client, {
      searchTerm: $("profileChecklistSearch").value,
      filter: $("profileChecklistFilter").value,
      onChange: (c) => {
        ltUpdateClient(data, c.id, {}, null);
        ltSave(data);
        ltRenderProgressTracker(c, $("progressTrackerBox"));
        $("pInfoStatus").innerHTML = statusBadge(c.status);
        ltToast("Checklist saved", "✔");
      }
    });
  }
  $("profileChecklistSearch").addEventListener("input", ltDebounce(renderProfileChecklist, 200));
  $("profileChecklistFilter").addEventListener("change", renderProfileChecklist);

  ltInitTabs($("profileOverlay"));

  function renderHistory(client) {
    const list = [...client.history].reverse();
    $("pHistoryList").innerHTML = list.map(h =>
      `<li><span>${ltEscapeHtml(h.text)}</span><span class="a-time">${ltFormatDateTime(h.date)}</span></li>`
    ).join("") || `<li class="muted">No history yet.</li>`;
  }

  $("pNotesArea").addEventListener("input", ltDebounce(() => {
    data = ltLoad();
    ltUpdateClient(data, activeClientId, { notes: $("pNotesArea").value }, null);
    ltToast("Notes saved", "📝");
  }, 600));

  $("pEditBtn").addEventListener("click", () => {
    data = ltLoad();
    const client = ltGetClient(data, activeClientId);
    closeModal("profileOverlay");
    openClientForm(client);
  });

  $("pDuplicateBtn").addEventListener("click", () => {
    data = ltLoad();
    const copy = ltDuplicateClient(data, activeClientId);
    closeModal("profileOverlay");
    renderTable();
    if (copy) { ltToast(`Duplicated as ${copy.id}`, "⧉"); }
  });

  $("pPdfBtn").addEventListener("click", () => {
    data = ltLoad();
    const client = ltGetClient(data, activeClientId);
    if (client) { ltDownloadClientPDF(client, data.settings.companyName); ltToast("PDF downloaded", "⇩"); }
  });

  $("pDeleteBtn").addEventListener("click", () => {
    data = ltLoad();
    const client = ltGetClient(data, activeClientId);
    if (!client) return;
    if (confirm(`Delete ${client.applicantName} (${client.id})? This cannot be undone.`)) {
      ltDeleteClient(data, activeClientId);
      closeModal("profileOverlay");
      renderTable();
      ltToast("Client deleted", "🗑");
    }
  });

  /* ---------- Init ---------- */
  renderTable();

  // Auto-open profile if linked from Dashboard/Calculator (?open=ID)
  const params = new URLSearchParams(window.location.search);
  const openId = params.get("open");
  if (openId) {
    data = ltLoad();
    if (ltGetClient(data, openId)) openProfile(openId);
  }
})();

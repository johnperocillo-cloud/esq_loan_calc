(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("checklist");
  ltApplyBranding();

  const $ = (id) => document.getElementById(id);
  let data = ltLoad();
  let activeId = null;

  function populateClientSelect(preselectId) {
    data = ltLoad();
    const sel = $("clientSelect");
    if (data.clients.length === 0) {
      $("noClientState").style.display = "block";
      $("checklistWorkspace").style.display = "none";
      return;
    }
    $("noClientState").style.display = "none";
    $("checklistWorkspace").style.display = "block";

    sel.innerHTML = data.clients.map(c => `<option value="${c.id}">${ltEscapeHtml(c.applicantName)} — ${c.id}</option>`).join("");
    const target = preselectId && data.clients.find(c => c.id === preselectId) ? preselectId : data.clients[0].id;
    sel.value = target;
    activeId = target;
    renderChecklist();
  }

  function renderChecklist() {
    data = ltLoad();
    const client = ltGetClient(data, activeId);
    if (!client) return;
    ltRenderProgressTracker(client, $("progressTrackerBox"));
    ltRenderChecklistUI($("checklistContainer"), client, {
      searchTerm: $("checklistSearch").value,
      filter: $("checklistFilterSelect").value,
      onChange: (c) => {
        ltUpdateClient(data, c.id, {}, null);
        ltSave(data);
        ltRenderProgressTracker(c, $("progressTrackerBox"));
        ltToast("Checklist saved", "✔");
      }
    });
  }

  $("clientSelect").addEventListener("change", (e) => { activeId = e.target.value; renderChecklist(); });
  $("checklistSearch").addEventListener("input", ltDebounce(renderChecklist, 200));
  $("checklistFilterSelect").addEventListener("change", renderChecklist);

  $("pdfBtn").addEventListener("click", () => {
    data = ltLoad();
    const client = ltGetClient(data, activeId);
    if (client) { ltDownloadClientPDF(client, data.settings.companyName); ltToast("PDF downloaded", "⇩"); }
  });

  $("printChecklistBtn").addEventListener("click", () => {
    $("checklistWorkspace").id = "checklistWorkspace";
    document.getElementById("checklistWorkspace").setAttribute("id", "printArea");
    window.print();
    document.getElementById("printArea").setAttribute("id", "checklistWorkspace");
  });

  const params = new URLSearchParams(window.location.search);
  populateClientSelect(params.get("client"));
})();

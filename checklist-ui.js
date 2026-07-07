/* ============================================================
   checklist-ui.js — Renders an interactive per-client checklist.
   Used on the Client Profile (clients.html) and the standalone
   Requirements Checklist page (checklist.html).
   ============================================================ */

function ltRenderProgressTracker(client, container) {
  const p = ltComputeProgress(client);
  const remaining = p.total - p.verified;
  container.innerHTML = `
    <div class="progress-label"><span>Overall Progress</span><span>${p.pct}%</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${p.pct}%;"></div></div>
    <div class="stat-grid" style="margin-top:16px; margin-bottom:0;">
      <div class="stat-card tone-success"><div class="label">Completed</div><div class="value" style="font-size:20px;">${p.verified}/${p.total}</div></div>
      <div class="stat-card tone-warning"><div class="label">Remaining</div><div class="value" style="font-size:20px;">${remaining}</div></div>
      <div class="stat-card tone-danger"><div class="label">Missing</div><div class="value" style="font-size:20px;">${p.missing}</div></div>
      <div class="stat-card"><div class="label">Estimated Completion</div><div class="value" style="font-size:20px;">${p.pct}%</div></div>
    </div>`;
}

/**
 * Renders the checklist for a given client into `container`.
 * opts: { searchTerm, filter, onChange(client) }
 */
function ltRenderChecklistUI(container, client, opts) {
  opts = opts || {};
  const search = (opts.searchTerm || "").toLowerCase().trim();
  const filter = opts.filter || "all";
  const sectionFilters = ["basic", "banking", "business", "verification", "insurance", "submission"];
  const visible = ltVisibleItems(client);

  let html = "";
  CHECKLIST_SCHEMA.forEach(sec => {
    const secItems = visible.filter(v => v.section === sec.key);
    if (secItems.length === 0) return;
    if (sectionFilters.includes(filter) && sec.key !== filter) return;

    const filteredItems = secItems.filter(it => {
      const state = ltGetItemState(client, sec.key, it.key);
      if (search && !it.label.toLowerCase().includes(search) && !(state.notes || "").toLowerCase().includes(search)) return false;
      if (filter === "pending" && state.status !== "pending") return false;
      if (filter === "completed" && state.status !== "verified") return false;
      if (filter === "incomplete" && state.status === "verified") return false;
      if (filter === "verified" && state.status !== "verified") return false;
      if (filter === "rejected" && state.status !== "rejected") return false;
      return true;
    });
    if (filteredItems.length === 0) return;

    const doneCount = secItems.filter(it => ltGetItemState(client, sec.key, it.key).status === "verified").length;

    html += `<div class="checklist-section open" data-section="${sec.key}">
      <div class="checklist-section-header" data-toggle="${sec.key}">
        <h3>${sec.icon} ${ltEscapeHtml(sec.label)}</h3>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="checklist-section-count">${doneCount}/${secItems.length}</span>
          <span class="chev">▾</span>
        </div>
      </div>
      <div class="checklist-section-body">
        ${filteredItems.map(it => {
          const state = ltGetItemState(client, sec.key, it.key);
          const hasNote = state.notes && state.notes.trim().length > 0;
          return `<div class="checklist-item">
            <div class="item-main">
              <div class="item-label">${ltEscapeHtml(it.label)}</div>
              ${it.hint ? `<div class="item-hint">${ltEscapeHtml(it.hint)}</div>` : ""}
              <div class="item-note-box ${hasNote ? "open" : ""}" data-note-box="${sec.key}:${it.key}">
                <textarea data-note-input="${sec.key}:${it.key}" placeholder="Add a note… (saves automatically)">${ltEscapeHtml(state.notes)}</textarea>
              </div>
            </div>
            <div class="item-controls">
              <button type="button" class="note-toggle ${hasNote ? "has-note" : ""}" data-note-toggle="${sec.key}:${it.key}" title="Add note">📝</button>
              <select class="status-select" data-status-select="${sec.key}:${it.key}">
                ${Object.keys(LT_STATUS_META).map(s => `<option value="${s}" ${state.status === s ? "selected" : ""}>${LT_STATUS_META[s].label}</option>`).join("")}
              </select>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  });

  if (!html) html = `<div class="empty-state"><div class="big-icon">🔍</div><p>No matching requirements.</p></div>`;
  container.innerHTML = html;

  container.querySelectorAll("[data-toggle]").forEach(h => {
    h.addEventListener("click", () => h.closest(".checklist-section").classList.toggle("open"));
  });
  container.querySelectorAll("[data-status-select]").forEach(sel => {
    sel.addEventListener("change", () => {
      const [sec, item] = sel.dataset.statusSelect.split(":");
      ltGetItemState(client, sec, item).status = sel.value;
      ltAutoUpdateStatus(client);
      if (opts.onChange) opts.onChange(client);
    });
  });
  container.querySelectorAll("[data-note-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const box = container.querySelector(`[data-note-box="${btn.dataset.noteToggle}"]`);
      box.classList.toggle("open");
    });
  });
  container.querySelectorAll("[data-note-input]").forEach(ta => {
    ta.addEventListener("input", ltDebounce(() => {
      const [sec, item] = ta.dataset.noteInput.split(":");
      ltGetItemState(client, sec, item).notes = ta.value;
      const toggleBtn = container.querySelector(`[data-note-toggle="${ta.dataset.noteInput}"]`);
      if (toggleBtn) toggleBtn.classList.toggle("has-note", ta.value.trim().length > 0);
      if (opts.onChange) opts.onChange(client);
    }, 500));
  });
}

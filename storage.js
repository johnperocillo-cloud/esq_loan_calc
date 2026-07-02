/* ============================================================
   storage.js — Local Storage data layer for Loan Officer Toolkit
   Single source of truth. Everything persists under one key so
   backup/restore is a single JSON blob.
   ============================================================ */

const LT_KEY = "loanToolkitData_v1";

function ltDefaultData() {
  return {
    version: 1,
    settings: {
      companyName: "Loan Officer Toolkit",
      companyPrefix: "ESQ",
      companyLogo: "",       // optional data URI override of assets/logo.png
      theme: "system",       // light | dark | system
      currency: "PHP",
      interestDefault: 3.5,
      serviceFeeDefault: 5,
      nextSeq: 1
    },
    clients: [],
    calculatorHistory: [],
    activity: []
  };
}

function ltLoad() {
  try {
    const raw = localStorage.getItem(LT_KEY);
    if (!raw) {
      const fresh = ltDefaultData();
      ltSave(fresh);
      return fresh;
    }
    const data = JSON.parse(raw);
    const d = ltDefaultData();
    data.settings = Object.assign({}, d.settings, data.settings || {});
    data.clients = Array.isArray(data.clients) ? data.clients : [];
    data.calculatorHistory = Array.isArray(data.calculatorHistory) ? data.calculatorHistory : [];
    data.activity = Array.isArray(data.activity) ? data.activity : [];
    data.version = d.version;
    return data;
  } catch (e) {
    console.error("LT: failed to load data, resetting.", e);
    const fresh = ltDefaultData();
    ltSave(fresh);
    return fresh;
  }
}

function ltSave(data) {
  try {
    localStorage.setItem(LT_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("LT: failed to save data (storage full?)", e);
    return false;
  }
}

/* ---------- Client ID generation: ESQ-2026-0001 ---------- */
function ltGenClientId(data) {
  const year = new Date().getFullYear();
  const seq = data.settings.nextSeq || 1;
  data.settings.nextSeq = seq + 1;
  const padded = String(seq).padStart(4, "0");
  return `${data.settings.companyPrefix || "ESQ"}-${year}-${padded}`;
}

/* ---------- Activity feed ---------- */
function ltAddActivity(data, text, icon) {
  data.activity.unshift({ date: new Date().toISOString(), text, icon: icon || "✔" });
  data.activity = data.activity.slice(0, 60);
}

/* ---------- Client CRUD ---------- */
function ltNewClient(data, fields) {
  const now = new Date().toISOString();
  const client = {
    id: ltGenClientId(data),
    applicantName: fields.applicantName || "Unnamed Applicant",
    contact: fields.contact || "",
    loanAmount: Number(fields.loanAmount) || 0,
    loanTerm: Number(fields.loanTerm) || 12,
    loanType: fields.loanType || "new",             // new | additional | reloan
    businessType: fields.businessType || "sole",     // sole | corporation
    interestRate: Number(fields.interestRate) || data.settings.interestDefault,
    serviceFee: Number(fields.serviceFee) || data.settings.serviceFeeDefault,
    notes: fields.notes || "",
    status: fields.status || "pending",              // pending | in-progress | completed | cancelled
    dateCreated: now,
    dateModified: now,
    checklist: {},
    history: [{ date: now, text: "Client created" }]
  };
  data.clients.unshift(client);
  ltAddActivity(data, `${client.applicantName} added as new client`, "👥");
  ltSave(data);
  return client;
}

function ltUpdateClient(data, id, fields, historyNote) {
  const c = data.clients.find(c => c.id === id);
  if (!c) return null;
  Object.assign(c, fields);
  c.dateModified = new Date().toISOString();
  if (historyNote) c.history.push({ date: c.dateModified, text: historyNote });
  ltSave(data);
  return c;
}

function ltDeleteClient(data, id) {
  const c = data.clients.find(c => c.id === id);
  data.clients = data.clients.filter(c => c.id !== id);
  if (c) ltAddActivity(data, `${c.applicantName} (${c.id}) was deleted`, "🗑");
  ltSave(data);
}

function ltDuplicateClient(data, id) {
  const c = data.clients.find(c => c.id === id);
  if (!c) return null;
  const now = new Date().toISOString();
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = ltGenClientId(data);
  copy.applicantName = c.applicantName + " (Copy)";
  copy.dateCreated = now;
  copy.dateModified = now;
  copy.status = "pending";
  copy.history = [{ date: now, text: `Duplicated from ${c.id}` }];
  data.clients.unshift(copy);
  ltAddActivity(data, `${copy.applicantName} duplicated from ${c.id}`, "⧉");
  ltSave(data);
  return copy;
}

function ltGetClient(data, id) {
  return data.clients.find(c => c.id === id) || null;
}

/* ---------- Backup / Restore / Export ---------- */
function ltDownloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ltCreateBackup(data) {
  ltDownloadJSON(data, "loan_toolkit_backup.json");
}

function ltRestoreBackup(data, jsonText) {
  const incoming = JSON.parse(jsonText);
  if (!incoming || !Array.isArray(incoming.clients)) throw new Error("Invalid backup file.");
  const d = ltDefaultData();
  incoming.settings = Object.assign({}, d.settings, incoming.settings || {});
  incoming.calculatorHistory = Array.isArray(incoming.calculatorHistory) ? incoming.calculatorHistory : [];
  incoming.activity = Array.isArray(incoming.activity) ? incoming.activity : [];
  ltSave(incoming);
  return incoming;
}

function ltClientsToCSV(clients) {
  const headers = ["Client ID", "Name", "Contact", "Loan Amount", "Loan Term", "Loan Type", "Business Type", "Status", "Completion %", "Date Created", "Notes"];
  const rows = clients.map(c => {
    const pct = ltComputeProgress(c).pct;
    return [c.id, c.applicantName, c.contact, c.loanAmount, c.loanTerm, c.loanType, c.businessType, c.status, pct, c.dateCreated, (c.notes || "").replace(/\n/g, " ")];
  });
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
}

function ltDownloadCSV(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

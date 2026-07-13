// ============================================================
// reports-api.js — Report data aggregation (charts + exports pull from here)
// ============================================================
import { supabase } from "./supabase.js";

function rangeStart(range) {
  const d = new Date();
  if (range === "daily") d.setHours(0, 0, 0, 0);
  else if (range === "weekly") d.setDate(d.getDate() - 7);
  else if (range === "monthly") d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export async function getClientsInRange(range) {
  const { data, error } = await supabase
    .from("clients")
    .select("*, officer:assigned_officer (full_name)")
    .gte("created_at", rangeStart(range))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReleasedLoans() {
  const { data, error } = await supabase.from("clients").select("*, officer:assigned_officer (full_name)").eq("status", "released").order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingLoans() {
  const { data, error } = await supabase.from("clients").select("*, officer:assigned_officer (full_name)").eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllClientsForExport() {
  const { data, error } = await supabase.from("clients").select("*, officer:assigned_officer (full_name)").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Loan volume + approval rate, month by month — for the Reports charts. */
export async function getPerformanceStats(monthsBack = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsBack - 1));
  since.setDate(1);
  const { data, error } = await supabase
    .from("clients")
    .select("created_at, status, loan_amount")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const now = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" }), key: `${d.getFullYear()}-${d.getMonth()}`, volume: 0, approved: 0, total: 0 });
  }
  data.forEach(c => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find(m => m.key === key);
    if (!m) return;
    m.total++;
    m.volume += Number(c.loan_amount) || 0;
    if (c.status === "approved" || c.status === "released") m.approved++;
  });
  return months;
}

export function clientsToCSVRows(clients) {
  const headers = ["Client ID", "Full Name", "Phone", "Email", "Loan Amount", "Loan Type", "Status", "Assigned Officer", "Date Created", "Notes"];
  const rows = clients.map(c => [
    c.client_code, c.full_name, c.phone, c.email, c.loan_amount, c.loan_type, c.status,
    c.officer?.full_name || "", c.created_at, (c.notes || "").replace(/\n/g, " ")
  ]);
  return [headers, ...rows];
}

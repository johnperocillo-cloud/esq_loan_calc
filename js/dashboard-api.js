// ============================================================
// dashboard-api.js — Aggregates for the Dashboard page
// ============================================================
import { supabase } from "./supabase.js";

export async function getDashboardStats() {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, status, loan_amount, loan_type, created_at, updated_at, follow_up_date");
  if (error) throw error;

  const total = clients.length;
  const byStatus = { pending: 0, approved: 0, released: 0, rejected: 0 };
  clients.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

  const todayStr = new Date().toDateString();
  const todayClients = clients.filter(c => new Date(c.created_at).toDateString() === todayStr).length;

  const avgLoan = total ? clients.reduce((s, c) => s + (Number(c.loan_amount) || 0), 0) / total : 0;
  const largestLoan = total ? Math.max(...clients.map(c => Number(c.loan_amount) || 0)) : 0;

  const typeCounts = {};
  clients.forEach(c => { typeCounts[c.loan_type] = (typeCounts[c.loan_type] || 0) + 1; });
  let commonType = "—", maxCount = 0;
  Object.keys(typeCounts).forEach(t => { if (typeCounts[t] > maxCount) { maxCount = typeCounts[t]; commonType = t; } });

  const now = new Date();
  const overdue = clients.filter(c => c.follow_up_date && new Date(c.follow_up_date) < now && c.status !== "released" && c.status !== "rejected").length;
  const upcoming = clients.filter(c => {
    if (!c.follow_up_date) return false;
    const diffDays = (new Date(c.follow_up_date) - now) / 86400000;
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  return { total, byStatus, todayClients, avgLoan, largestLoan, commonType, overdue, upcoming };
}

export async function getAverageCompletion() {
  const { data, error } = await supabase.from("client_checklists").select("status");
  if (error) throw error;
  if (!data || data.length === 0) return 0;
  const verified = data.filter(r => r.status === "verified").length;
  return Math.round((verified / data.length) * 100);
}

export async function getRecentClients(limit = 5) {
  const { data, error } = await supabase
    .from("clients")
    .select("*, officer:assigned_officer (full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getRecentlyModifiedClients(limit = 5) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, client_code, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getPendingChecklistCount() {
  const { count, error } = await supabase
    .from("client_checklists")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "rejected"]);
  if (error) throw error;
  return count || 0;
}

/** Clients with an upcoming (next 7 days) or overdue follow-up — for reminders. */
export async function getFollowUpReminders() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, client_code, follow_up_date, status")
    .not("follow_up_date", "is", null)
    .not("status", "in", "(released,rejected)")
    .order("follow_up_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRecentActivities(limit = 20) {
  const { data, error } = await supabase
    .from("activities")
    .select("*, profiles:user_id (full_name), clients:client_id (full_name, client_code)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Turns a raw activity row into a human-readable line for the UI. */
export function describeActivity(a) {
  const who = a.profiles?.full_name || "Someone";
  const whoClient = a.clients ? `${a.clients.full_name} (${a.clients.client_code})` : "a client";
  const map = {
    created_client: `${who} added ${whoClient}`,
    edited_client: `${who} updated ${whoClient}`,
    deleted_client: `${who} deleted ${whoClient}`,
    calculator_used: `${who} ran a loan calculation${a.clients ? " for " + whoClient : ""}`,
    checklist_updated: `${who} updated the checklist for ${whoClient}`,
    login: `${who} logged in`,
    logout: `${who} logged out`
  };
  return map[a.action] || `${who} — ${a.action}`;
}

export async function getMonthlyClientCounts(monthsBack = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsBack - 1));
  since.setDate(1);
  const { data, error } = await supabase
    .from("clients")
    .select("created_at")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const months = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" }), key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 });
  }
  data.forEach(c => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find(m => m.key === key);
    if (m) m.count++;
  });
  return months;
}

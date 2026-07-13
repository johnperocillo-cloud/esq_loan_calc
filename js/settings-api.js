// ============================================================
// settings-api.js — Shared app settings (single row, admin-writable)
// ============================================================
import { supabase } from "./supabase.js";

export async function getSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

/** Uploads a new company logo to the public `branding` bucket and returns its public URL. */
export async function uploadCompanyLogo(file) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `logo_${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("branding").getPublicUrl(path);
  return data.publicUrl;
}

/** Only admins/managers can succeed here — enforced by RLS, not just the UI. */
export async function updateSettings(fields) {
  const payload = {};
  if ("companyName" in fields) payload.company_name = fields.companyName;
  if ("companyPrefix" in fields) payload.company_prefix = (fields.companyPrefix || "ESQ").toUpperCase();
  if ("companyLogoUrl" in fields) payload.company_logo_url = fields.companyLogoUrl;
  if ("interestRateDefault" in fields) payload.interest_rate_default = Number(fields.interestRateDefault) || 0;
  if ("serviceFeeDefault" in fields) payload.service_fee_default = Number(fields.serviceFeeDefault) || 0;
  if ("loanTypes" in fields) payload.loan_types = fields.loanTypes;
  if ("statuses" in fields) payload.statuses = fields.statuses;

  const { data, error } = await supabase.from("settings").update(payload).eq("id", 1).select().single();
  if (error) throw error;
  return data;
}

/** Admin-only: list every user profile for a Users management panel. */
export async function getAllUsers() {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

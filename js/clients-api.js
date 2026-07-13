// ============================================================
// clients-api.js — Client CRUD (Supabase)
// ============================================================
import { supabase } from "./supabase.js";

// Internal — logs an activity row without needing a separate module.
async function logActivity(action, details, clientId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("activities").insert({
      user_id: session?.user?.id || null,
      action,
      details: details || {},
      client_id: clientId || null
    });
  } catch (e) {
    console.warn("Activity log skipped:", e.message);
  }
}

/**
 * Fetches clients visible to the current user (RLS already limits
 * loan_officers to their assigned clients — admins/managers see all).
 * filters: { search, status, assignedOfficer }
 */
export async function getClients(filters = {}) {
  let query = supabase.from("clients").select("*, officer:assigned_officer (full_name)").order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.assignedOfficer) query = query.eq("assigned_officer", filters.assignedOfficer);
  if (filters.search) {
    const s = filters.search.trim();
    query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,client_code.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getClient(id) {
  const { data, error } = await supabase
    .from("clients")
    .select("*, officer:assigned_officer (full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a client. Client code is generated atomically server-side
 * via the generate_client_code() Postgres function (see schema.sql) —
 * this avoids two officers colliding on the same sequence number.
 */
export async function createClient(fields) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { data: codeData, error: codeErr } = await supabase.rpc("generate_client_code");
  if (codeErr) throw codeErr;

  const payload = {
    client_code: codeData,
    full_name: fields.fullName,
    birthdate: fields.birthdate || null,
    address: fields.address || "",
    phone: fields.phone || "",
    email: fields.email || "",
    loan_amount: Number(fields.loanAmount) || 0,
    loan_type: fields.loanType || "New Client",
    status: fields.status || "pending",
    assigned_officer: fields.assignedOfficer || userId,
    notes: fields.notes || "",
    follow_up_date: fields.followUpDate || null,
    created_by: userId
  };

  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  if (error) throw error;

  await logActivity("created_client", { client_code: data.client_code }, data.id);
  return data;
}

export async function updateClient(id, fields) {
  const payload = {};
  if ("fullName" in fields) payload.full_name = fields.fullName;
  if ("birthdate" in fields) payload.birthdate = fields.birthdate || null;
  if ("address" in fields) payload.address = fields.address;
  if ("phone" in fields) payload.phone = fields.phone;
  if ("email" in fields) payload.email = fields.email;
  if ("loanAmount" in fields) payload.loan_amount = Number(fields.loanAmount) || 0;
  if ("loanType" in fields) payload.loan_type = fields.loanType;
  if ("status" in fields) payload.status = fields.status;
  if ("assignedOfficer" in fields) payload.assigned_officer = fields.assignedOfficer;
  if ("notes" in fields) payload.notes = fields.notes;
  if ("followUpDate" in fields) payload.follow_up_date = fields.followUpDate || null;

  const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
  if (error) throw error;

  await logActivity("edited_client", { fields: Object.keys(payload) }, id);
  return data;
}

export async function deleteClient(id) {
  const client = await getClient(id).catch(() => null);
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  await logActivity("deleted_client", { client_code: client?.client_code });
}

export async function duplicateClient(id) {
  const original = await getClient(id);
  return createClient({
    fullName: original.full_name + " (Copy)",
    birthdate: original.birthdate,
    address: original.address,
    phone: original.phone,
    email: original.email,
    loanAmount: original.loan_amount,
    loanType: original.loan_type,
    status: "pending",
    assignedOfficer: original.assigned_officer,
    notes: original.notes
  });
}

/** All loan officers/managers/admins — for an "Assigned Officer" dropdown. */
export async function getOfficers() {
  const { data, error } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  if (error) throw error;
  return data;
}

/**
 * Checklist helper kept here (not a separate file) since it's small:
 * returns the 8-item checklist state for a client as
 * { item_key: { status, notes } }, seeding default "pending" rows
 * for any of the 8 pipeline items that don't exist yet.
 */
const CHECKLIST_ITEM_KEYS = ["valid_id", "proof_of_income", "collateral", "application_form", "interview", "ci", "approval", "release"];

export async function getClientChecklist(clientId) {
  const { data, error } = await supabase.from("client_checklists").select("*").eq("client_id", clientId);
  if (error) throw error;

  const state = {};
  (data || []).forEach(row => { state[row.item_key] = { status: row.status, notes: row.notes || "" }; });

  const missing = CHECKLIST_ITEM_KEYS.filter(k => !state[k]);
  if (missing.length > 0) {
    const rows = missing.map(k => ({ client_id: clientId, item_key: k, status: "pending", notes: "" }));
    await supabase.from("client_checklists").upsert(rows, { onConflict: "client_id,item_key" });
    missing.forEach(k => { state[k] = { status: "pending", notes: "" }; });
  }
  return state;
}

export async function updateClientChecklistItem(clientId, itemKey, changes) {
  const { data: existing } = await supabase
    .from("client_checklists").select("*")
    .eq("client_id", clientId).eq("item_key", itemKey).maybeSingle();
  const { data: { session } } = await supabase.auth.getSession();

  const { error } = await supabase.from("client_checklists").upsert({
    client_id: clientId,
    item_key: itemKey,
    status: changes.status ?? existing?.status ?? "pending",
    notes: changes.notes ?? existing?.notes ?? "",
    updated_by: session?.user?.id || null
  }, { onConflict: "client_id,item_key" });
  if (error) throw error;

  await logActivity("checklist_updated", { item_key: itemKey, ...changes }, clientId);
}

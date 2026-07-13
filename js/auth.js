// ============================================================
// auth.js — Authentication (Supabase Auth)
// ============================================================
import { supabase } from "./supabase.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await logAuthEvent("login");
  return data;
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName || email } }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await logAuthEvent("logout");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const redirectTo = window.location.origin + window.location.pathname.replace(/[^/]+$/, "login.html");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (error) { console.error("getCurrentProfile:", error); return null; }
  return { ...data, email: session.user.email };
}

/**
 * Call this at the top of every protected page. Redirects to login.html
 * if there's no active session. Returns the profile if authenticated.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return getCurrentProfile();
}

export function isAdminOrManager(profile) {
  return !!profile && (profile.role === "admin" || profile.role === "manager");
}

// Internal — logs login/logout without depending on a separate
// activities module, so auth.js has zero sibling dependencies.
async function logAuthEvent(action) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase.from("activities").insert({ user_id: userId, action, details: {} });
  } catch (e) {
    console.warn("Activity log skipped:", e.message);
  }
}

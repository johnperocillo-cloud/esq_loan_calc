// ============================================================
// supabase.js — Supabase client initialization
// ============================================================
// ⚠️ FILL THESE IN from your Supabase project (Settings → API).
// The anon key is safe to ship in frontend code — Row Level
// Security in supabase/policies.sql is what actually protects
// the data, not secrecy of this key.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

if (SUPABASE_URL.startsWith("YOUR_")) {
  console.warn(
    "[Loan Officer Toolkit] supabase.js still has placeholder credentials. " +
    "Open js/supabase.js and paste your Project URL + anon key (see SUPABASE_SETUP.md)."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ============================================================
// api.js — Shared helpers for every *-api.js module
// ============================================================

/**
 * Wraps an async Supabase call, returning [data, error] instead of
 * throwing, and showing a toast on failure (if ltToast exists on
 * the page). Keeps page code tidy:
 *   const [clients, err] = await ltTry(clientsApi.getClients());
 *   if (err) return;
 */
export async function ltTry(promise, friendlyMessage) {
  try {
    const result = await promise;
    if (result && result.error) throw result.error;
    return [result && "data" in result ? result.data : result, null];
  } catch (err) {
    console.error(err);
    const msg = friendlyMessage || ltFriendlyError(err);
    if (typeof ltToast === "function") ltToast(msg, "⚠");
    return [null, err];
  }
}

/** Shows a simple inline loading state inside a container. */
export function ltShowLoading(container, label) {
  container.innerHTML = `<div class="empty-state"><div class="big-icon">⏳</div><p>${label || "Loading…"}</p></div>`;
}

/** Offline banner — call once per page after DOM is ready. */
export function ltInitOfflineBanner() {
  let banner = document.getElementById("ltOfflineBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "ltOfflineBanner";
    banner.className = "validation-banner no-print";
    banner.style.position = "sticky";
    banner.style.top = "0";
    banner.style.zIndex = "60";
    banner.style.borderRadius = "0";
    banner.textContent = "⚠ You're offline — changes won't save until your connection returns.";
    document.body.prepend(banner);
  }
  function update() { banner.classList.toggle("show", !navigator.onLine); }
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

/** Formats a Supabase/Postgres error into something readable. */
export function ltFriendlyError(err) {
  if (!err) return "Unknown error.";
  if (err.code === "23505") return "That record already exists.";
  if (err.code === "42501") return "You don't have permission to do that.";
  if (err.code === "PGRST301" || err.status === 401) return "Your session expired — please log in again.";
  if (err.message && err.message.includes("Failed to fetch")) return "Couldn't reach the server — check your connection.";
  return err.message || "Something went wrong.";
}

// Guest sandbox session state.
//
// The flag lives in localStorage rather than React state so a hard reload of
// /demo/projectDetail/:id still resolves to the sandbox after a page refresh, which
// is exactly the persistence guests expect. It also deliberately does NOT live in a
// cookie or in the Neon session: nothing here grants or implies any server-side
// identity.

export const DEMO_MODE_KEY = "devboard:demo-mode";
export const DEMO_DATA_KEY = "devboard:demo-projects";

export function isDemoMode(): boolean {
  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    // Private browsing modes can throw on localStorage access. Treat that as
    // "not in demo mode" rather than crashing the app.
    return false;
  }
}

export function enterDemoMode(): void {
  try {
    window.localStorage.setItem(DEMO_MODE_KEY, "1");
  } catch {
    // Persistence is best-effort; the in-memory sandbox still works for this visit.
  }
}

export function exitDemoMode(): void {
  try {
    window.localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // Ignore: nothing to clean up if storage is unavailable.
  }
}

export function readStoredDemoData<T>(fallback: T): T {
  try {
    const raw = window.localStorage.getItem(DEMO_DATA_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    // A shape check rather than a blind cast: a stale payload from an older fixture
    // must fall back to the seed instead of crashing a component deep in the tree.
    if (!Array.isArray(parsed)) return fallback;

    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStoredDemoData(data: unknown): void {
  try {
    window.localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
  } catch {
    // Quota or private-mode failure. The in-memory store remains authoritative for
    // the current visit, so the demo keeps working until reload.
  }
}

export function clearStoredDemoData(): void {
  try {
    window.localStorage.removeItem(DEMO_DATA_KEY);
  } catch {
    // Ignore.
  }
}
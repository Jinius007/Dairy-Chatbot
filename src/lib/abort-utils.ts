/** AbortSignal helpers with fallbacks for older WebViews. */

export function createTimeoutSignal(ms: number, parent?: AbortSignal): AbortSignal {
  if (typeof AbortSignal.timeout === "function") {
    const t = AbortSignal.timeout(ms);
    return parent ? anyAbortSignal([parent, t]) : t;
  }
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => clearTimeout(id);
  ctrl.signal.addEventListener("abort", onAbort, { once: true });
  if (parent) {
    if (parent.aborted) ctrl.abort();
    else parent.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

export function anyAbortSignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort();
      break;
    }
    s.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

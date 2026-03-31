const IS_DEV = import.meta.env.DEV;

// Allows enabling logs in production builds for debugging:
// - localStorage.setItem('debug', '1')
// - or add `?debug=1` to URL
let isDebugEnabled = IS_DEV;
if (!IS_DEV && typeof window !== "undefined") {
  try {
    const params = new URLSearchParams(window.location.search);
    isDebugEnabled = params.get("debug") === "1" || window.localStorage.getItem("debug") === "1";
  } catch {
    // ignore
  }
}

export function debugLog(...args: unknown[]) {
  if (!isDebugEnabled) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function debugInfo(...args: unknown[]) {
  if (!isDebugEnabled) return;
  // eslint-disable-next-line no-console
  console.info(...args);
}

export function debugDebug(...args: unknown[]) {
  if (!isDebugEnabled) return;
  // eslint-disable-next-line no-console
  console.debug(...args);
}


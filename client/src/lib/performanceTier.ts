export type PerformanceTier = "low" | "normal";

function getBooleanFromQueryOrStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(key) === "1") return true;
    if (window.localStorage.getItem(key) === "1") return true;
  } catch {
    // ignore
  }
  return false;
}

export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === "undefined") return "normal";

  // Manual override for testing:
  // - ?perf=low or localStorage.setItem('perf','low')
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("perf");
    const fromStorage = window.localStorage.getItem("perf");
    const forced = (fromQuery || fromStorage || "").toLowerCase();
    if (forced === "low") return "low";
    if (forced === "normal") return "normal";
  } catch {
    // ignore
  }

  const navAny = navigator as any;
  const deviceMemory: number | undefined = navAny.deviceMemory;
  const hardwareConcurrency: number | undefined = navAny.hardwareConcurrency;
  const connection = navAny.connection;
  const saveData: boolean | undefined = connection?.saveData;

  const prefersReducedMotion = (() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  })();

  // Conservative heuristic: keep normal visuals for most users.
  const lowMemory = typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 4;
  const lowCpu = typeof hardwareConcurrency === "number" && hardwareConcurrency > 0 && hardwareConcurrency <= 4;

  if (saveData) return "low";
  if (prefersReducedMotion) return "low";
  if (lowMemory && lowCpu) return "low";
  if (lowMemory) return "low";

  // Allow forcing low tier via debug flags.
  if (getBooleanFromQueryOrStorage("perfLow")) return "low";

  return "normal";
}

export function applyPerformanceTierClass(tier: PerformanceTier) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("perf-low", tier === "low");
  root.classList.toggle("perf-normal", tier === "normal");
}


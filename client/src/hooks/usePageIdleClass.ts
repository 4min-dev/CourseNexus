import { useEffect } from "react";

type Options = {
  enabled?: boolean;
  /** How long to keep animations running after mount. */
  initialActiveMs?: number;
  /** Idle timeout after last user input. */
  idleAfterMs?: number;
  /** Minimum delay between activity updates. */
  activityThrottleMs?: number;
  /** Track high-frequency pointermove input. */
  trackPointerMove?: boolean;
  /** Track high-frequency wheel input. */
  trackWheel?: boolean;
  /** Track high-frequency mousemove input. */
  trackMouseMove?: boolean;
  /** Track scroll input. */
  trackScroll?: boolean;
};

export function usePageIdleClass(options: Options = {}) {
  const {
    enabled = true,
    initialActiveMs = 5000,
    idleAfterMs = 2500,
    activityThrottleMs = 100,
    trackPointerMove = true,
    trackWheel = true,
    trackMouseMove = true,
    trackScroll = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const root = document.documentElement;
    let idleTimer: number | null = null;
    let initialTimer: number | null = null;
    let isInitialPhase = true;
    let idleState = false;
    let lastActiveAt = 0;

    const setIdle = (idle: boolean) => {
      if (idleState === idle) return;
      idleState = idle;
      root.dataset.pageIdle = idle ? "1" : "0";
    };

    const scheduleIdle = (ms: number) => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdle(true), ms);
    };

    const markActive = () => {
      if (document.visibilityState !== "visible") return;
      if (isInitialPhase) return; // keep active during initial paint/animations
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (activityThrottleMs > 0 && now - lastActiveAt < activityThrottleMs) return;
      lastActiveAt = now;
      setIdle(false);
      scheduleIdle(idleAfterMs);
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        setIdle(true);
        if (idleTimer !== null) window.clearTimeout(idleTimer);
        idleTimer = null;
        return;
      }
      markActive();
    };

    // Start as "active" to keep the intended first impression.
    setIdle(false);
    scheduleIdle(initialActiveMs + idleAfterMs);
    initialTimer = window.setTimeout(() => {
      isInitialPhase = false;
      scheduleIdle(idleAfterMs);
    }, initialActiveMs);

    const opts: AddEventListenerOptions = { passive: true };
    if (trackMouseMove) {
      window.addEventListener("mousemove", markActive, opts);
    }
    if (trackPointerMove) {
      window.addEventListener("pointermove", markActive, opts);
    }
    if (trackScroll) {
      window.addEventListener("scroll", markActive, opts);
    }
    if (trackWheel) {
      window.addEventListener("wheel", markActive, opts);
    }
    window.addEventListener("touchstart", markActive, opts);
    window.addEventListener("keydown", markActive);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      delete root.dataset.pageIdle;
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (initialTimer !== null) window.clearTimeout(initialTimer);
      if (trackMouseMove) {
        window.removeEventListener("mousemove", markActive);
      }
      if (trackPointerMove) {
        window.removeEventListener("pointermove", markActive);
      }
      if (trackScroll) {
        window.removeEventListener("scroll", markActive);
      }
      if (trackWheel) {
        window.removeEventListener("wheel", markActive);
      }
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("keydown", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    enabled,
    initialActiveMs,
    idleAfterMs,
    activityThrottleMs,
    trackPointerMove,
    trackWheel,
    trackMouseMove,
    trackScroll,
  ]);
}


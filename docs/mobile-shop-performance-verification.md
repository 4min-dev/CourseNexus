# Mobile Shop Performance Verification

This checklist validates the mobile-only optimizations for `/shop` and guards desktop parity.

## Preconditions

- Environment variables are configured (`DATABASE_URL` is required by the app server).
- App is running in a production-like build (or stable staging).
- Test on a real mobile device plus Chrome DevTools emulation.

## 1) Baseline / After Profile Procedure

Run the same sequence twice:
- `baseline` (before optimization branch)
- `after` (current optimized branch)

### Scenario A: Idle on `/shop`
- Open `/shop` with no interaction for 60s.
- Capture Performance trace.
- Record:
  - Main thread busy %
  - Long tasks count (`>50ms`)
  - Recalculate Style / Layout / Paint time
  - Total network requests in 60s

### Scenario B: Typical interaction
- Scroll page for ~30s, swipe carousel, open/close filters.
- Capture trace and record same metrics.

## 2) KPI Targets

- Idle main thread: `< 10-15%` on mobile profile.
- Long tasks in idle: `~0` (or near-zero).
- Background requests frequency reduced (mobile header polling should be sparse).
- No visible FPS drops during regular swipe/scroll.

## 3) Desktop Parity Gates (must pass)

- Desktop visuals unchanged on `/shop`.
- Desktop interactions unchanged:
  - filters
  - page navigation
  - course card behavior
  - top courses section
- No desktop-only regressions in polling or timing behavior.

## 4) Regression Checklist

- Tags marquee pauses when cards are offscreen on mobile.
- Info banner pauses when tab is hidden or banner is out of viewport.
- Header polling on mobile pauses on hidden tab and resumes on focus.
- Page navigation remains accurate while scroll cost is lower on mobile.
- URL/filter sync still works and is stable under quick filter changes.

## 5) Rollout Plan

1. Deploy to staging.
2. Run Scenario A/B and collect metrics.
3. Smoke-test desktop parity.
4. If KPIs pass and no regressions, release to production.
5. Monitor first 24h:
   - client CPU complaints
   - battery drain reports
   - errors around navigation/filters/header polling

## Notes from this environment

- `npm run dev` is blocked here without `DATABASE_URL`.
- `npm run check` currently fails due many unrelated project-wide TypeScript errors.
- Modified files for this task are lint-clean via IDE diagnostics.

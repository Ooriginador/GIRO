# Accessibility Static Report (Automated Scan)

Date: 2026-01-20

Summary

- Converted non-semantic interactive elements found in tests to `button` elements.
- Improved keyboard accessibility in `Spotlight` and `ProductCard` components.
- Added `clickableByKeyboard` helper at `apps/desktop/src/lib/a11y.ts` for reuse.
- Hardened Tauri invoke wrapper with timeouts and structured logging.

Files with non-semantic interactive elements (found by grep)

- `apps/desktop/src/components/motoparts/__tests__/WarrantyForm.test.tsx` (mock `CommandItem` used a `div` → converted to `button`).
- `apps/desktop/src/components/motoparts/__tests__/ServiceOrderForm.test.tsx` (mock `CommandItem` used a `div` → converted to `button`).

Other important a11y changes made

- `apps/desktop/src/components/tutorial/Spotlight.tsx`: improved focus management, restored previous focus, keyboard handlers for Enter/Space/Escape, and proper tabIndex on overlay elements.
- `apps/desktop/src/components/pdv/ProductCard.tsx`: detailed variant now supports keyboard activation via `clickableByKeyboard`, sets `aria-disabled` when out of stock, and prevents pointer events when disabled.
- `apps/desktop/src/lib/a11y.ts`: helper `clickableByKeyboard` and `safeRestoreFocus`.

Recommendations / Next quick fixes (prioritized)

1. Replace other non-semantic interactive usages (if any) with `button` or use `clickableByKeyboard`.
   - Low effort: scan for `onClick` on `div|span|li` and update accordingly.
2. Ensure all custom components that act like buttons expose `role="button"`, `tabIndex=0`, and keyboard handlers (Enter/Space).
3. Run dynamic axe scan and address `critical` and `serious` violations first (contrast, focus order, aria attributes missing).
4. Add automated axe checks to CI (Playwright + axe-core) to prevent regressions.

Quick patches already applied

- `Spotlight.tsx` (focus/keyboard)
- `ProductCard.tsx` (keyboard + aria-disabled)
- Tests updated to use `button`

How to run the dynamic scan locally (preview + Playwright script)

1. Build and preview the app:

```bash
pnpm --filter @giro/desktop run build
pnpm --filter @giro/desktop run preview
```

2. In a separate terminal, run the scanner (saved at `apps/desktop/scripts/axe-scan.cjs`):

```bash
node apps/desktop/scripts/axe-scan.cjs http://localhost:4173 ../../axe-report.json
```

If you want, I can:

- Apply `clickableByKeyboard` automatically across all detected non-button interactives (I can generate the patch).
- Re-run the dynamic axe scan and produce `axe-report.json` (I attempted earlier; I can retry with the preview server running persistently).
- Integrate axe checks into CI (Playwright + GitHub Action template).

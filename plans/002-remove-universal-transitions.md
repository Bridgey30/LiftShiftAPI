# 002 — Remove universal `*` transition and global `transition: all` on chart cards

- **Status**: DONE
- **Commit**: 09b877d
- **Severity**: HIGH
- **Category**: 5. Performance / 1. Purpose & frequency
- **Estimated scope**: 1 file, ~15 lines

## Problem

`frontend/index.html` injects two global rules that put motion on **every element** in the app (a dashboard seen 100+ times/day):

```css
/* frontend/index.html:113-117 — current */
* {
  transition-property: color, border-color, opacity, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

```css
/* frontend/index.html:120-125 — current */
[class*="bg-slate-900 border"] {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
[class*="bg-slate-900 border"]:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}
```

Problems:
- The `*` rule means every color/border/opacity change anywhere in the app animates by default with no motion intent — nothing answers "why does this animate?" (AUDIT §1). The 150ms default is slower than needed for color feedback and cannot be overridden by `duration-*` utilities cleanly (inline class transitions on individual elements are fine; the universal default is not).
- `transition: all 0.3s` on `[class*="bg-slate-900 border"]` animates unintended properties (box-shadow, border, bg) off-GPU across the entire dashboard card subtree (AUDIT §5: `transition: all` is always a finding).

## Target

Delete both rules and replace with an explicitly-scoped card hover:

```css
/* frontend/index.html — target (replaces lines 113-125) */
/* Chart container hover */
[class*="bg-slate-900 border"] {
  transition: box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
[class*="bg-slate-900 border"]:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}
```

The universal `*` rule is removed entirely. Elements that need transitions already declare them (Tailwind `transition-colors`/`duration-*`/`transition-all` classes — the latter are handled separately in plan 003). Elements that legitimately animate `color/border/opacity` on hover keep that behavior because their components already carry `transition-colors` or `transition-all` classes.

## Repo conventions to follow

- The custom curve `cubic-bezier(0.23, 1, 0.32, 1)` is the AUDIT `--ease-out` value (AUDIT.md §2) — plan 010 introduces it as a token; until then inline it here exactly.
- `index.html` is also where `.animate-in`, `.fade-in`, `slide-in-from-*` utilities already live (lines 96-108) — keep this file as the home of global injected styles.

## Steps

1. In `frontend/index.html`, delete the `* { transition-property: ... }` rule (lines 113-117).
2. Replace the `[class*="bg-slate-900 border"] { transition: all 0.3s ... }` rule with the box-shadow-scoped target above. Keep the `:hover` shadow rule.

## Boundaries

- Do NOT touch the `@keyframes scaleIn`/`.animate-in`/`.fade-in`/`slide-in-from-*` blocks in the same file.
- Do NOT add or remove class names in any TSX file.
- If removing the `*` rule visibly removes a transition that no component declares explicitly, note the location and report it instead of re-adding the universal rule.

## Verification

- **Mechanical**: `npm run build` passes.
- **Feel check**:
  - Hover a dashboard card: shadow eases in, nothing else fades/slides.
  - Hover nav links and buttons in the app shell: any color change is instant or governed by their own `transition-colors` classes — nothing moves that shouldn't.
  - In DevTools Computed panel on a dashboard card, confirm `transition-property: box-shadow` (not `all`).
- **Done when**: no element in the app has an implicit transition from a universal rule; the only global transition is `box-shadow` on chart cards.

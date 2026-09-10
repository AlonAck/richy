# design-sync notes for richy-design-system

## Scope — read before touching deletes

The live project (`414c2899-91fb-4611-aebd-31883deefa1a`, "Richy Design
System") has real content this repo's `design-system/src/` does **not**
produce and must never delete:

- `components/motion/` — `AmountReadout`, `GradientShimmer`,
  `ResponseStream`. These likely come from `components/ui/*.tsx` at the repo
  root (a separate, TypeScript/shadcn-style source tree — `amount-slider.tsx`,
  `gradient-shimmer.tsx`, `response-stream.tsx`, `liquid-glass-button.tsx`)
  from an earlier, more complete sync run. Not reconciled into
  `design-system/` as of this note.
- `guidelines/` (brand-badges, brand-mark, brand-voice, colors-*, motion-*,
  surfaces-*, type-*), `ui_kits/richy-app/` (AdvisorScreen, OverviewScreen),
  `assets/` (badges, fonts, logo), `uploads/` (reference screenshots/video).

**Decision (10 Sep 2026, Alon, explicit)**: this sync is scoped to add/update
only what `design-system/src/` produces (the 7 core components). Everything
above is excluded from the delete review and left untouched.

No `_ds_sync.json` verification anchor exists in the project (the earlier
run that produced the content above didn't leave one, or used different
tooling), so this run has no anchor to diff against — treat it as a
first-time scope-limited sync, not a re-sync.

## Known drift going in

- `tokens.js` was stale (old purple/"Mika's Violet" theme) before this run;
  refreshed to the cornflower-blue flagship (`#3C4C82`/`#5C7AE3`) — see the
  repo's `.claude/skills/apple-ui-design/SKILL.md` for the full palette.
- The live project's `guidelines/colors-violet.html` (and similar) likely
  still documents the old purple flagship — out of scope for this sync
  (guidelines/ is untouched per the decision above), but worth a follow-up
  sync once `design-system/src/` covers the full component set.
- `BigBtn` is a plain flat button (not glass) — kept as-is; `LiquidButton`
  is the new, separate glass primitive, not a replacement for it.

## Upload landed — 10 Sep 2026

`components/general/*` (7 components incl. LiquidButton, cornflower-blue
tokens) uploaded successfully. **New duplication created, not resolved**:
`components/core/*` (the same 6 non-LiquidButton components, still on the
old purple theme from an earlier sync) still exists in the project
alongside the new `components/general/*` group — the design agent now sees
two versions of Card/BigBtn/CatBadge/IconBadge/ProgressBar/SVGIcon. Next
sync should either delete `components/core/*` (confirm with Alon first —
same rule as the motion/guidelines content) or regroup `general` to replace
`core` outright via `componentSrcMap`/group naming.

Also unresolved: `guidelines/colors-violet.html` (and likely other
guideline pages) still documents the pre-refresh purple flagship, not
cornflower blue — out of scope for this sync per the scope-guard decision,
but real drift between the guidelines and the actual components now.

## Re-sync risks

- The `components/ui/*.tsx` (motion) vs `design-system/src/*.jsx` (core)
  split means a future "full rebuild" run must NOT simply point at
  `design-system/src/` and treat the result as complete — it would delete
  the motion components. Reconcile the two sources (either pull
  `components/ui/*.tsx` into `design-system/`, or point a future run's
  scope explicitly) before ever doing a from-scratch rebuild.
- No TypeScript in `design-system/src/` — `.d.ts` extraction runs in
  ts-morph's weaker inference/synth mode. Prop contracts in the uploaded
  `.d.ts` files may be looser than a real `.tsx` source would produce.

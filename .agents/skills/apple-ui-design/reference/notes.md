# Reference library — motion notes

Alon is adding real screen recordings of well-made native apps as reference
for "what native actually looks and moves like." This file is a growing,
plain-language log of what each clip shows, so a future session doesn't have
to re-extract frames to know what's in them. Add a new dated entry per clip.

---

## claude-ios-nav-and-modelsheet-2026-08-27.mov

Source: the Claude iOS app itself (Alon's own phone). Shows two of the
patterns already called out in `../SKILL.md`, at real timing/speed — worth
opening the actual video for the timing, this is just the shot list.

**1. Screen push navigation (chat list → chat).** Tapping into a chat does
not just fade the new screen in. The chat-list screen visibly *slides left
and stays partly visible underneath*, with a soft drop-shadow along the seam
where the incoming screen overlaps it. Both screens are moving at once. This
is the standard iOS "push" transition — Richy's screen-to-screen navigation
should use this (slide + underlying-screen parallax + seam shadow), not a
plain fade or a new screen sliding in alone over a static background.

**2. Bottom sheet ("Select model").** When the sheet opens: the background
(the icon, the "What's cooking, Alon?" text, the nav buttons) dims under a
translucent gray layer *and* scales down a few percent at the same time —
both together are what read as "this layer is now inactive, a new one is on
top." The sheet itself rises from the bottom edge with rounded top corners
and a small horizontal drag-handle bar centered at the top. A nice detail:
the app's own logo mark sits right at the seam between the dimmed background
and the sheet, visually stitching the two layers together. Closed via the
"X" top-left of the sheet.

**Takeaway for Richy:** a modal isn't just "a box that appears" — it's the
background *actively receding* (dim + slight scale-down) while the sheet
*actively arrives* (slide-up + rounded corners + handle). Both halves matter;
doing only the sheet-slide-up half and leaving the background static is what
reads as "web app," not "native app."

---

## apple-watch-app-tabs-and-modals-2026-08-27.mp4

Source: Apple's own Apple Watch companion app on iPhone. Pure dark-mode
screens end to end — a good second data point next to the Claude app clip.

**1. Tab bar + collapsing title.** Switching between "My Watch" and "Face
Gallery" (bottom tab bar) swaps the whole screen. On "Face Gallery", the
title starts large and left-aligned above the content; scroll down and it
shrinks and re-centers into a small pinned header while the content
scrolls underneath it. This is the standard "large title collapses on
scroll" pattern — worth using on any Richy screen with a title + long
scrolling list (Overview, Reports, a category's transaction list).

**2. Card grid, one consistent shape.** The Face Gallery content is a grid
of cards (Health and Fitness, Photos, Clean, Data Rich, Pride Collection,
Dress Watch, Tool Watch, Bold, Playful, World Scripts, Motion, Nike
Collection...) — every card is the same shape: bold title top-left, an
image/icon in the middle, one line of description at the bottom, rounded
corners, dark elevated surface. Nothing improvises its own layout. This is
what "one design system, used everywhere" looks like in practice.

**3. Full-screen modal (not a small sheet).** Tapping "Start Pairing"
brings up "Set Up Apple Watch" as a **full-screen** modal (keeps the same
background photo, but "Cancel" appears top-right instead of a back arrow).
Full-screen modal = a top-right Cancel/Done, used for a self-contained flow
you can back out of entirely. Compare to video 1's small bottom sheet
(drag handle, X) used for a quick in-context choice. Richy should pick
one of these two per situation, not invent a third pattern: quick choice
= small sheet; multi-step flow (like a savings goal setup or the debt
questionnaire) = full-screen modal with Cancel.

**4. Push *inside* a modal.** Once you choose "Set Up for Myself," the
Cancel button is replaced by a back chevron and the flow continues
("Searching for Apple Watch...") — i.e. a modal can still contain its own
internal push navigation once you're committed to the flow. Confirms the
Cancel-vs-back distinction in #3 is intentional, not incidental.

**5. External link opens as a card, not a full takeover.** Tapping a
"Learn more" link slides in Safari as its own card from the right, with
the previous screen still peeking on the left edge and a drag handle at
the bottom of the new card — the same family as a bottom sheet, just
edge-to-edge. Use this for anything that leaves Richy's own flow (e.g. an
external legal/help link), instead of navigating away in the same view.

**Takeaway for Richy:** three modal styles exist for three different
purposes — small bottom sheet (quick in-context choice, video 1 & 2),
full-screen modal with Cancel (a self-contained flow, e.g. "add a debt" or
onboarding), and a slide-in card (leaving to external content). Picking
the right one per screen, consistently, matters as much as the visual
styling.

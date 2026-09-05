# The Firestore document split

**Status: on branch `firestore-split`, not merged. Nothing in production has
changed until the rollout below is done, in order.**

## Why

Until now an account was **one Firestore document**, `users/{uid}`, holding
every transaction, budget, goal, chat and setting, and the web app saved by
rebuilding that whole document from React state and calling `set()` on it.
One client, one writer: fine. Two clients - the web app on a laptop and the
native iOS app on a phone - and whichever saved second silently erased the
other's work. The migration plan calls this the one finding that gates every
native write, and it is the reason the iOS foundation reads and writes
nothing in Firestore yet.

The single document was also the reason `trimChatArchive()` and the "more
history than Richy can store in one record" error exist: Firestore caps a
document at 1 MiB, and an account grows without bound.

## What changed

Two things, and only two.

**1. Every write to `users/{uid}` is now a field-level `update()`.**
`save()` computes a *patch* - the keys the caller passed, plus any of the
seventeen "ambient" keys whose state no longer matches the last known
document - and `flushSave()` sends exactly that. Nothing outside the patch is
touched on the server, so a second client editing other fields at the same
time is never overwritten. `set()` survives in one place: creating a brand
new account. A side effect worth having: `update()` fails on a missing
document instead of recreating it, so a late debounced write can no longer
resurrect an account that was just deleted.

**2. Transactions move from the `tx[]` array to one document each,
`users/{uid}/tx/{id}`**, keyed by the transaction's id as a string. The
parent document records which world an account is in:

| `txSchema` on `users/{uid}` | Where transactions live | What the client does |
| --- | --- | --- |
| absent or `1` | `tx[]` on the document | exactly what it did before the split, plus it writes `txSchema: 1` alongside every array write |
| `2` | the `tx` subcollection; the array is gone | writes only the documents a user action changed |

The client decides once per session, at load, and never flips mid-session.
Screens still hand whole arrays to `onSaveTx`; a diff against the last
persisted array turns that into per-document `set`/`delete` operations,
batched 450 at a time, sent in order, retried on failure with the same banner
as before.

Nothing else moved. Budgets, goals, categories, folders, savings, businesses,
investing, debts, notes, trips, decisions, chats and settings stay on the
parent document as fields - now written field by field. The household
document is untouched: it keeps the shared plan and shared transactions as
arrays, exactly as before.

## How an account moves, and why it cannot lose anything

The rule everything rests on: **the parent's array wins until a session boots
and sees `txSchema: 2`.**

On load, an account still on the array:

1. Every array entry is written as a document, in batches. Any document
   already in the subcollection that the array no longer lists is deleted
   (an interrupted earlier attempt can never bring back a deleted
   transaction). Duplicate ids in the array - possible with `Date.now()`
   ids - are re-numbered deterministically first, so they cannot collapse
   into one document.
2. The switch itself is a **transaction against a fresh read of the parent**:
   anything another session added to or removed from the array while the
   batches were in flight is carried over, then the parent gets
   `txSchema: 2` and loses its array - unless another device has already
   switched it, in which case nothing is written and the subcollection is
   simply read.
3. If the move cannot complete - offline, rules not yet published, a slow
   link past the 20-second boot budget - the session carries on with the
   array as if nothing had happened, and the switch is *not* made. Batches
   that finish later are harmless scratch for the next attempt.

While a session is on the array, every array write also writes
`txSchema: 1`. That is what makes step 3 safe: a move that lands late can
never outrank an array this session wrote after it, because the very next
save puts the account back on schema 1 and the next boot moves it again from
the array, which is authoritative.

An **older cached client** (the service worker keeps the previous bundle
until the next online open) that saves while an account is already on schema
2 writes the array back. The next new-client boot imports whatever that
array holds that the subcollection lacks, then clears it. Deletions made by
that old client cannot be told apart from documents it never knew about, so
only additions are reconciled - the transition window is one app open.

## Rollout - in this order

1. **Publish the rules.** Firebase console -> Firestore -> Rules -> paste
   `firestore.rules` -> Publish. The new block is the `match /tx/{txId}`
   under `users/{uid}`. Until this is published, the code is safe to deploy
   but every account stays on the array (the move fails cleanly on
   permission-denied).
2. **Test on the branch's Vercel preview** with a **test account, never a
   real user's**: open it - the preview that serves this branch is
   https://richy-preview-git-firestore-split-richard201.vercel.app; the
   `richy` and `richy-mgkl` projects put a Vercel login in front of theirs,
   `richy-preview` and `richy-cowork-preview` are open - sign up with email
   + password, add a few transactions, then reload (the move runs when a
   signed-in session boots, so at sign-in and at every reload; a brand-new
   account has nothing to move yet). **Google sign-in does not work on a
   preview host:** Firebase Auth only allows OAuth from the domains listed
   under Authentication -> Settings -> Authorized domains, and only
   `richy-mgkl.vercel.app` is there (checked 5 Sep 2026). Either add the
   preview host to that list for the test, or use email + password, which
   works from any host. Watch the console for `Richy: tx move` (only
   failures log; success is silent - `permission-denied` there means step 1
   is not published yet), confirm
   the account document in the console now shows `txSchema: 2` and no `tx`
   field, and that the `tx` subcollection holds every transaction. Then add,
   edit and delete transactions; reload; open a second tab and make a
   different change in each; nothing should be lost in either.
3. **Merge to `master`.** That deploys it. Accounts move one by one as
   people open the app. **Done 2026-09-05** - steps 1 and 2 were verified
   on Alon's own account first (schema 2, six transactions in the
   subcollection, no array); the add/edit/delete and two-tab checks were
   skipped on Alon's call.

## What the iOS app must do

Read `users/{uid}` for settings and the small arrays; read `users/{uid}/tx`
for transactions and sort by numeric `id`. Respect `txSchema`: if it is not
`2`, the account has not moved yet - read the `tx[]` array and **do not
write transactions** (the web app will move the account on its next open).
Write transactions only as documents, and everything else only through
`update()` on named fields. Never `set()` the parent.

## Cost note

Loading an account now reads one document per transaction instead of one
document in total: a heavy account (a few thousand transactions) costs a few
thousand reads per cold open. That is within Firestore's free tier for the
current user base and cheap beyond it, but the right long-term shape is a
listener on the subcollection, which after the first sync bills only the
documents that changed and gives both clients live updates for free. That is
the next step, not this one.

## Not in this change (next, in order)

- A live listener on `users/{uid}/tx` (cost, and cross-client live updates).
- `richardChats` to its own subcollection - the other unbounded array, still
  capped by `trimChatArchive()` today.
- UUID ids instead of `Date.now()` - touches every creation site and the
  assumption that id order is chronological, so it is its own change.
- `api/_prompts.js` wiring in `api/chat.js`, so the prompts leave the client.

## Files

- `budget-app.jsx` - the transaction store helpers and `CLOUD.updateUser`,
  `loadTx`, `writeTx`, `migrateTx`, `reconcileLegacyTx`; in `App()`:
  `prepareTxStore`, `queueTxWrite`, `flushTxQueue`, `persistTxNow`,
  `persistBlob`, and `save`/`flushSave` rewritten around a patch.
- `firestore.rules` - the `tx` subcollection.
- `api/delete-account.js`, `admin/reset-users.js` - drain the subcollection
  before the parent document, in pages (deleting a document does not delete
  its subcollections).

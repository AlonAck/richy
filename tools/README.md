# tools/

Checks for `budget-app.jsx`. It is one ~29,000-line file with no test suite, so
these stand in for the things a build normally catches.

| script | what it proves |
|---|---|
| `check-undeclared.mjs` | No identifier is referenced that nothing declares. The production build only transforms JSX, so a stray reference would otherwise only surface as a runtime `ReferenceError` on whatever path happens to hit it. |
| `smoke-boot.mjs` | The built bundle boots in headless Chromium and renders, with no console errors or uncaught exceptions. Firebase/CDN network failures are expected in a sandbox and are filtered out. |
| `check-logic.mjs` | The pure helpers that no UI test reaches (recurring materialisation, the demo-sync sweep, safe-to-spend, suggestion picking) do what they claim on real inputs. Lifts each function out of the single-file module by name and runs it standalone. |
| `render-app.mjs` | The real bundle boots and renders as a signed-in user, with a stubbed Firebase in place of the vendored SDK. `overview` (default) seeds a returning user with a recurring item awaiting confirmation; `onboarding` drops into the questionnaire (`STEP=n` walks forward). Writes a full-page screenshot to /tmp. |
| `check-translations.mjs` | Every `tr()` key exists in all four languages and every `tr()` call resolves. Keys live in three tables merged at load (`TRANSLATIONS`, `FOLDER_STRINGS`, `ONBOARD_STRINGS`), so it evaluates them rather than scraping. A missing key renders as the raw key name. |
| `check-regressions.mjs` | The features the Tier 0 fixes touch still open and render with no uncaught errors: Overview, Activity, Budgets, Goals, Advisor, the debt tracker, business and investing accounts, Collab, Settings - plus a check that no hardcoded `$` leaks onto a shekel account. |
| `verify-prompts.js` | Every prompt in `api/_prompts.js` is byte-identical to the client-side text it replaced, except those listed in its `INTENDED` map with a reason. Takes a git rev to compare against - use the commit **before** the prompts moved server-side (`9b5d426`). |

`smoke-boot.mjs` needs a Chromium and a driver, neither of which is a project
dependency (nothing here is shipped to users): `npm i --no-save playwright-core`,
and point `executablePath` at whatever Chromium is on the machine.

```sh
npm run build            # must pass first - smoke-boot reads public/
node tools/check-undeclared.mjs
node tools/check-logic.mjs
node tools/check-translations.mjs
node tools/render-app.mjs overview          # LANG_CODE=he renders it in Hebrew
node tools/smoke-boot.mjs
node tools/check-regressions.mjs
node tools/verify-prompts.js 9b5d426   # the commit before the prompts moved server-side
```

# tools/

Checks for `budget-app.jsx`. It is one ~29,000-line file with no test suite, so
these stand in for the things a build normally catches.

| script | what it proves |
|---|---|
| `check-undeclared.mjs` | No identifier is referenced that nothing declares. The production build only transforms JSX, so a stray reference would otherwise only surface as a runtime `ReferenceError` on whatever path happens to hit it. |
| `smoke-boot.mjs` | The built bundle boots in headless Chromium and renders, with no console errors or uncaught exceptions. Firebase/CDN network failures are expected in a sandbox and are filtered out. |
| `verify-prompts.js` | Every prompt in `api/_prompts.js` is byte-identical to the client-side text it replaced. Takes an optional git rev (default `HEAD`) to compare against. |

`smoke-boot.mjs` needs a Chromium and a driver, neither of which is a project
dependency (nothing here is shipped to users): `npm i --no-save playwright-core`,
and point `executablePath` at whatever Chromium is on the machine.

```sh
npm run build            # must pass first - smoke-boot reads public/
node tools/check-undeclared.mjs
node tools/smoke-boot.mjs
node tools/verify-prompts.js <rev-before-the-prompt-migration>
```

# Shell, build and service-worker wiring for Clerk

## `index.html` — script tags

Clerk must load **before** `clerk-init.js`, which needs `window.Clerk` the
instant it runs. Not `async`/`defer`, same as the Firebase tags.

```html
<!-- Firebase (compat build exposes a global "firebase"). Auth here is used only
     by the invisible Clerk->Firebase bridge (signInWithCustomToken) so
     Firestore's security rules keep working; Firestore is the real database. -->
<script src="/vendor/firebase-app-compat.js?v=__RICHY_BUILD__"></script>
<script src="/vendor/firebase-auth-compat.js?v=__RICHY_BUILD__"></script>
<script src="/vendor/firebase-firestore-compat.js?v=__RICHY_BUILD__"></script>
<script src="/firebase-init.js?v=__RICHY_BUILD__"></script>
<!-- Clerk (exposes a global "Clerk") - the auth UI/UX the user actually sees. -->
<script src="/vendor/clerk.browser.js?v=__RICHY_BUILD__"></script>
<script src="/clerk-init.js?v=__RICHY_BUILD__"></script>
```

Serve Clerk **same-origin from `/vendor/`**, not from a CDN. A CDN failure left
the app unable to boot at all — permanently on iOS, where Capacitor's
`capacitor://` scheme means the service worker never runs and nothing is cached.
Same-origin is also what keeps the App Store Guideline 2.5.2 answer ("no code
downloaded at runtime") true.

## `build.mjs`

Add to the static file list so it lands in `public/`:

```js
const staticFiles = [ /* ... */ "clerk-init.js", /* ... */ ];
```

Add to the vendored runtime list (copied out of `node_modules` at deploy time):

```js
const vendor = [
  // ...
  ["clerk.browser.js", ["node_modules/@clerk/clerk-js/dist/clerk.browser.js"]],
];
```

## `sw.js` — precache

```js
var SHELL = [
  // ...
  "/clerk-init.js?v=" + BUILD,
  "/vendor/clerk.browser.js?v=" + BUILD,
];
```

Note the fetch handler leaves cross-origin requests alone entirely — Clerk's
auth endpoints are live data and must never be served from cache.

## `package.json`

```json
{
  "dependencies": {
    "@clerk/backend": "^1.0.0",
    "@clerk/clerk-js": "^5.0.0"
  }
}
```

`@clerk/backend` is used by the API functions; `@clerk/clerk-js` exists only so
`build.mjs` can vendor `clerk.browser.js` out of `node_modules`.

## Local dev harness (`preview.html`)

The dev harness loads the same two scripts. If you point it at CDN copies
instead of `/vendor/`, pin the major version (`@clerk/clerk-js@5`) — `@latest`
means a breaking Clerk release can land in your dev environment unannounced.

## Privacy policy

Clerk becomes a data processor and must be disclosed. Richy's `privacy.html`
listed it as:

| Provider | What it does | What it receives |
|---|---|---|
| Clerk | Authentication (sign-up, sign-in, passwords) | Email, name, password (never visible to us) |

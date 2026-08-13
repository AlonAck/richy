// Clerk-backed CLOUD auth for Richy. Extracted verbatim from budget-app.jsx
// at commit 034ca0a, where this ran in production. See ../SKILL.md.
//
// The non-auth CLOUD methods (loadUser, saveUser, households, sync inbox) are
// pure Firestore and unchanged by Clerk - they are omitted here on purpose.

function _fb() {
  return (typeof window !== "undefined" && window.firebase) ? window.firebase : null;
}
function cloudReady() {
  var f = _fb();
  return !!(f && f.apps && f.apps.length);
}
// True once real keys are in firebase-init.js AND clerk-init.js, regardless of
// whether the SDKs actually loaded - lets cloudErrorMsg() tell "never
// configured" apart from "SDK failed to load this time" (ad blocker, flaky
// connection).
function cloudConfigured() {
  return typeof window !== "undefined" && window.__RICHY_FB_CONFIGURED__ === true && window.__RICHY_CLERK_CONFIGURED__ === true;
}
function cloudErrorMsg() {
  return cloudConfigured() ? CLOUD_CONNECT_MSG : CLOUD_SETUP_MSG;
}
function _auth() { return _fb().auth(); }
function _fsdb() { return _fb().firestore(); }
function _clerk() {
  return (typeof window !== "undefined" && window.Clerk) ? window.Clerk : null;
}
// Clerk.load() is an async network call (unlike Firebase's synchronous
// initializeApp), so anything that touches Clerk waits on this promise first.
function _clerkReady() {
  return (typeof window !== "undefined" && window.__RICHY_CLERK_READY__) || Promise.reject(new Error("Clerk is not configured."));
}
// See the big comment above: keeps Firestore's request.auth populated with
// the Clerk user id after every sign-in, without the user ever seeing it.
function _bridgeToFirebase() {
  var c = _clerk();
  var cu = c && c.session;
  if (!cu) return cloudReady() ? _auth().signOut().catch(function() {}) : Promise.resolve();
  return c.session.getToken().then(function(token) {
    return fetch("/api/clerk-firebase-token", { headers: { Authorization: "Bearer " + token } });
  }).then(function(r) { return r.json(); }).then(function(j) {
    if (!j || !j.ok || !j.token) throw new Error((j && j.error && j.error.message) || "Could not establish a database session.");
    return _auth().signInWithCustomToken(j.token);
  });
}
// Normalizes a Clerk error into the same { code: "auth/...", message } shape
// Firebase errors used to have, so the many existing `err.code === "auth/..."`
// checks throughout the sign-in/account-settings UI keep working unchanged.
function _clerkErr(e) {
  var first = (e && e.errors && e.errors[0]) || null;
  var code = first ? first.code : "";
  var mapped = "";
  if (code === "form_password_incorrect") mapped = "auth/wrong-password";
  else if (code === "form_identifier_not_found") mapped = "auth/user-not-found";
  else if (code === "form_identifier_exists") mapped = "auth/email-already-in-use";
  else if (code === "form_password_pwned" || code === "form_password_length_too_short" || code === "form_password_validation_failed") mapped = "auth/weak-password";
  else if (code === "form_param_format_invalid" || code === "form_identifier_invalid") mapped = "auth/invalid-email";
  else if (code === "too_many_requests") mapped = "auth/too-many-requests";
  else if (code === "network_error") mapped = "auth/network-request-failed";
  var msg = (first && (first.longMessage || first.message)) || (e && e.message) || "Something went wrong. Please try again.";
  var out = new Error(msg);
  out.code = mapped;
  out.message = msg;
  throw out;
}

var CLOUD = {
  // Subscribe to sign-in state. cb receives the Clerk user (or null). Returns
  // an unsubscribe function. Fires once immediately with the restored session -
  // after first silently bridging to Firebase so Firestore calls are authorized.
  onAuth: function(cb) {
    if (!cloudReady()) { cb(null); return function () {}; }
    var cancelled = false;
    var unsub = function() {};
    _clerkReady().then(function() {
      if (cancelled) return;
      var c = _clerk();
      if (!c) { cb(null); return; }
      var fire = function() {
        if (!c.user) { cb(null); return; }
        _bridgeToFirebase().then(function() { cb(c.user); }).catch(function() { cb(null); });
      };
      fire();
      unsub = c.addListener(fire);
    }).catch(function() { if (!cancelled) cb(null); });
    return function() { cancelled = true; unsub(); };
  },
  signUp: function(email, password) {
    return _clerkReady().then(function() {
      return _clerk().client.signUp.create({ emailAddress: email, password: password });
    }).then(function(su) {
      if (su.status !== "complete") {
        // Clerk's dashboard has "verify at sign-up" turned off per
        // CLERK_SETUP.md so this should always complete immediately, same as
        // Firebase's createUserWithEmailAndPassword did.
        var e = new Error("Sign up could not complete."); e.code = "auth/operation-not-allowed"; throw e;
      }
      return _clerk().setActive({ session: su.createdSessionId }).then(function() {
        // Bridge to Firebase now (not just via the onAuth listener, which fires
        // asynchronously on its own) - finishSignup() writes the new user's doc
        // to Firestore right after this resolves, and that write needs
        // request.auth already populated or the security rules reject it.
        return _bridgeToFirebase();
      }).then(function() {
        return { user: { uid: su.createdUserId } };
      });
    }).catch(_clerkErr);
  },
  signIn: function(email, password) {
    return _clerkReady().then(function() {
      return _clerk().client.signIn.create({ identifier: email, password: password });
    }).then(function(si) {
      if (si.status !== "complete") {
        var e = new Error("Sign in could not complete."); e.code = "auth/wrong-password"; throw e;
      }
      return _clerk().setActive({ session: si.createdSessionId }).then(function() {
        return _bridgeToFirebase();
      });
    }).catch(_clerkErr);
  },
  // Google sign-in via Clerk is a full-page redirect (not a popup like
  // Firebase's signInWithPopup) - the page navigates away to Google and back;
  // CLOUD.onAuth picks up the new session once Clerk completes the redirect.
  signInGoogle: function() {
    return _clerkReady().then(function() {
      return _clerk().client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.href,
        redirectUrlComplete: window.location.href
      });
    }).catch(_clerkErr);
  },
  signOut: function() {
    var c = _clerk();
    var p = c ? c.signOut() : Promise.resolve();
    return p.catch(function() {}).then(function() {
      return cloudReady() ? _auth().signOut().catch(function() {}) : Promise.resolve();
    });
  },

  // ---- password / email (Clerk-specific signatures) -------------------------
  hasPasswordProvider: function() {
    var c = _clerk();
    var cu = c ? c.user : null;
    return !!(cu && cu.passwordEnabled);
  },
  // Clerk verifies the current password AND sets the new one in one call - no
  // separate reauthenticate step needed the way Firebase required.
  updatePassword: function(newPw, oldPw) {
    return _clerkReady().then(function() {
      var cu = _clerk().user;
      return cu.updatePassword({ currentPassword: oldPw, newPassword: newPw });
    }).catch(_clerkErr);
  },
  linkPassword: function(email, pw) {
    return _clerkReady().then(function() {
      var cu = _clerk().user;
      // No currentPassword: this account is Google-only so far.
      return cu.updatePassword({ newPassword: pw });
    }).catch(_clerkErr);
  },
  sendPasswordReset: function(email) {
    return _clerkReady().then(function() {
      return _clerk().client.signIn.create({ identifier: email, strategy: "reset_password_email_code" });
    }).catch(_clerkErr);
  },
  // NOTE: Clerk requires a newly-added email to be verified (one-time code)
  // before it can become primary - unlike Firebase's old immediate updateEmail.
  // This starts that flow; EditEmailView (budget-app.jsx) currently has no
  // code-entry step, so wire one up before shipping email changes for real.
  updateEmail: function(newEmail) {
    return _clerkReady().then(function() {
      var cu = _clerk().user;
      return cu.createEmailAddress({ email: newEmail });
    }).then(function(ea) {
      return ea.prepareVerification({ strategy: "email_code" }).then(function() { return ea; });
    }).catch(_clerkErr);
  },
};

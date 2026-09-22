// purge-whatsapp.js -- DESTRUCTIVE (but narrow). Deletes every leftover
// document in the Firestore "whatsappOptIn" and "whatsappPhones" collections
// for project richy-91667.
//
// WhatsApp Alerts was decommissioned 2026-09-10 (see api/whatsapp.js and
// ROADMAP.md). The feature's code path is gone, but any opt-in/phone-mapping
// documents that existed BEFORE that change are still sitting in Firestore --
// this is the one-time cleanup that finishes the removal. Nothing in
// budget-app.jsx ever reads these collections client-side, so deleting them
// is safe with no app-code follow-up required.
//
// It will NOT run without an explicit confirmation flag, so you can't trigger
// it by accident:
//     node purge-whatsapp.js --yes
//
// CREDENTIALS (pick one) -- same as reset-users.js, see admin/README.md:
//   * Google Cloud Shell (recommended): already signed in as you. Nothing to do.
//   * Local: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file
//     (Firebase Console > Project settings > Service accounts > Generate key).

var admin = require("firebase-admin");

var PROJECT_ID = "richy-91667";
var COLLECTIONS = ["whatsappOptIn", "whatsappPhones"];

function init() {
  admin.initializeApp({ projectId: PROJECT_ID });
}

async function purgeCollection(db, name) {
  var col = db.collection(name);
  var deleted = 0;

  while (true) {
    var snap = await col.limit(400).get();
    if (snap.empty) break;
    var batch = db.batch();
    snap.docs.forEach(function (doc) { batch.delete(doc.ref); });
    await batch.commit();
    deleted += snap.size;
    console.log("  " + name + ": deleted " + deleted + " so far...");
  }

  return deleted;
}

async function main() {
  if (process.argv.indexOf("--yes") === -1) {
    console.log("Refusing to run without confirmation.");
    console.log("This PERMANENTLY deletes every document in " + COLLECTIONS.join(" and ") + " for project " + PROJECT_ID + ".");
    console.log("Re-run with:  node purge-whatsapp.js --yes");
    process.exit(1);
  }

  init();
  var db = admin.firestore();
  console.log("Project: " + PROJECT_ID);
  console.log("");

  var totals = {};
  for (var i = 0; i < COLLECTIONS.length; i++) {
    var name = COLLECTIONS[i];
    console.log("Purging \"" + name + "\"...");
    totals[name] = await purgeCollection(db, name);
    console.log(name + " documents deleted: " + totals[name]);
    console.log("");
  }

  console.log("Done. WhatsApp Alerts leftovers are fully purged.");
  process.exit(0);
}

main().catch(function (err) {
  console.error("Failed:", err);
  process.exit(1);
});

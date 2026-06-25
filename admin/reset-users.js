// reset-users.js -- DESTRUCTIVE. Deletes ALL Firebase Auth accounts and ALL
// documents in the Firestore "users" collection for project richy-91667.
// Everyone starts from zero: accounts gone, data gone. This cannot be undone.
//
// It will NOT run without an explicit confirmation flag, so you can't trigger
// it by accident:
//     node reset-users.js --yes
//
// CREDENTIALS (pick one):
//   * Google Cloud Shell (recommended): already signed in as you. Nothing to do.
//   * Local: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file
//     (Firebase Console > Project settings > Service accounts > Generate key).
//
// See admin/README.md for step-by-step run instructions.

var admin = require("firebase-admin");

var PROJECT_ID = "richy-91667";
var USERS_COLLECTION = "users";

function init() {
  // With no args, the Admin SDK uses Application Default Credentials:
  // the logged-in user in Cloud Shell, or GOOGLE_APPLICATION_CREDENTIALS locally.
  admin.initializeApp({ projectId: PROJECT_ID });
}

async function deleteAllAuthUsers() {
  var auth = admin.auth();
  var deleted = 0;
  var pageToken = undefined;

  do {
    var res = await auth.listUsers(1000, pageToken);
    var uids = res.users.map(function (u) { return u.uid; });
    if (uids.length > 0) {
      var result = await auth.deleteUsers(uids); // up to 1000 per call
      deleted += result.successCount;
      if (result.failureCount > 0) {
        console.log("  " + result.failureCount + " auth deletions failed in this batch:");
        result.errors.forEach(function (e) {
          console.log("    uid index " + e.index + ": " + e.error.message);
        });
      }
      console.log("  deleted " + deleted + " auth accounts so far...");
    }
    pageToken = res.pageToken;
  } while (pageToken);

  return deleted;
}

async function deleteUsersCollection() {
  var db = admin.firestore();
  var col = db.collection(USERS_COLLECTION);
  var deleted = 0;

  while (true) {
    var snap = await col.limit(400).get();
    if (snap.empty) break;
    var batch = db.batch();
    snap.docs.forEach(function (doc) { batch.delete(doc.ref); });
    await batch.commit();
    deleted += snap.size;
    console.log("  deleted " + deleted + " firestore user docs so far...");
  }

  return deleted;
}

async function main() {
  if (process.argv.indexOf("--yes") === -1) {
    console.log("Refusing to run without confirmation.");
    console.log("This PERMANENTLY deletes every account and all user data in project " + PROJECT_ID + ".");
    console.log("Re-run with:  node reset-users.js --yes");
    process.exit(1);
  }

  init();
  console.log("Project: " + PROJECT_ID);
  console.log("");

  console.log("Deleting Firestore \"" + USERS_COLLECTION + "\" documents...");
  var docs = await deleteUsersCollection();
  console.log("Firestore docs deleted: " + docs);
  console.log("");

  console.log("Deleting Firebase Auth accounts...");
  var accounts = await deleteAllAuthUsers();
  console.log("Auth accounts deleted: " + accounts);
  console.log("");

  console.log("Done. Everyone starts from zero.");
  process.exit(0);
}

main().catch(function (err) {
  console.error("Failed:", err);
  process.exit(1);
});

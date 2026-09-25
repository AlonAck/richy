// The smallest test runner that says what failed and why. No dependencies:
// this repo has no test framework, and the point of these files is that they
// run with nothing but node.
let passed = 0;
const failures = [];
let group = "";

export function section(name) { group = name; }

export function check(name, ok, detail) {
  if (ok) { passed++; return true; }
  failures.push((group ? group + " / " : "") + name + (detail !== undefined ? "\n      " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""));
  return false;
}

export function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  return check(name, a === b, "got " + a + "\n      want " + b);
}

export async function rejects(name, promise, code) {
  try {
    await promise;
    return check(name, false, "resolved; expected the error " + code);
  } catch (e) {
    return check(name, e && e.impCode === code, "rejected with " + ((e && e.impCode) || (e && e.message) || e) + ", expected " + code);
  }
}

export function done(label) {
  console.log((label ? label + ": " : "") + passed + " passed, " + failures.length + " failed");
  failures.forEach((f) => console.log("  FAIL " + f));
  if (failures.length) process.exitCode = 1;
}

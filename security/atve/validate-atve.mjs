import fs from "node:fs";

const ATVE_FILE = "security/atve/ATVE-001.json";
const AUDIT_CONFIG_FILE = "audit-ci.json";

const APPROVED_ADVISORY = "GHSA-m9gg-hp2v-232j";
const APPROVED_EXPIRES_AT = "2026-11-02";
const APPROVED_DEPENDENCY_PATHS = [
  "GHSA-m9gg-hp2v-232j|@firebase/firestore>@grpc/grpc-js>",
  "GHSA-m9gg-hp2v-232j|@firebase/rules-unit-testing>firebase>@firebase/firestore-compat>@firebase/firestore>@grpc/grpc-js"
];

function fail(message) {
  console.error(`ATVE_FAIL: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`cannot read or parse ${file}: ${error.message}`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseStrictDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    fail(`${field} must use YYYY-MM-DD`);
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    fail(`${field} is not a real calendar date`);
    return null;
  }

  return date;
}

const atve = readJson(ATVE_FILE);
const auditConfig = readJson(AUDIT_CONFIG_FILE);

if (!atve || !auditConfig) {
  process.exitCode = 1;
} else {
  const requiredStrings = [
    "id",
    "status",
    "advisory",
    "severity",
    "package",
    "affectedVersion",
    "createdAt",
    "expiresAt",
    "owner",
    "reason",
    "upstream"
  ];

  for (const field of requiredStrings) {
    if (!isNonEmptyString(atve[field])) {
      fail(`${field} is required`);
    }
  }

  if (atve.id !== "ATVE-001") {
    fail("unexpected ATVE id");
  }

  if (atve.status !== "retired") {
    fail("status must be retired");
  }

  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(atve.advisory ?? "")) {
    fail("advisory must be a valid GHSA identifier");
  }

  if (atve.advisory !== APPROVED_ADVISORY) {
    fail("advisory differs from Council-approved exception");
  }

  if (atve.severity !== "high") {
    fail("severity must be high");
  }

  if (atve.package !== "@grpc/grpc-js") {
    fail("unexpected package");
  }

  if (atve.affectedVersion !== "1.9.16") {
    fail("unexpected affectedVersion");
  }

  if (
    !Array.isArray(atve.dependencyPaths) ||
    atve.dependencyPaths.length === 0
  ) {
    fail("dependencyPaths must be a non-empty array");
  }

  if (
    Array.isArray(atve.dependencyPaths) &&
    new Set(atve.dependencyPaths).size !== atve.dependencyPaths.length
  ) {
    fail("dependencyPaths contains duplicates");
  }

  if (
    Array.isArray(atve.dependencyPaths) &&
    atve.dependencyPaths.some((path) => !isNonEmptyString(path))
  ) {
    fail("dependencyPaths contains an invalid path");
  }

  if (Array.isArray(atve.dependencyPaths)) {
    const actualPaths = [...atve.dependencyPaths].sort();
    const approvedPaths = [...APPROVED_DEPENDENCY_PATHS].sort();

    if (
      actualPaths.length !== approvedPaths.length ||
      actualPaths.some((path, index) => path !== approvedPaths[index])
    ) {
      fail("dependencyPaths differ from Council-approved paths");
    }
  }

  const created = parseStrictDate(atve.createdAt, "createdAt");
  const expires = parseStrictDate(atve.expiresAt, "expiresAt");

  if (atve.expiresAt !== APPROVED_EXPIRES_AT) {
    fail("expiresAt differs from Council-approved deadline");
  }

  if (created && expires && expires < created) {
    fail("expiresAt cannot be before createdAt");
  }

  if (!isNonEmptyString(atve.retirementReason)) {
    fail("retirementReason is required");
  }
  const retired = parseStrictDate(atve.retiredAt, "retiredAt");
  if (retired && created && retired < created) {
    fail("retiredAt cannot be before createdAt");
  }
  if (retired && expires && retired > expires) {
    fail("retiredAt cannot be after approved expiry date");
  }
  if (retired && retired.getTime() > Date.now()) {
    fail("retiredAt cannot be in the future");
  }

  // Historical expiry is retained, but no active exception survives retirement.

  const allowedAuditConfigKeys = ["allowlist", "high"];
  const actualAuditConfigKeys = Object.keys(auditConfig).sort();

  if (
    actualAuditConfigKeys.length !== allowedAuditConfigKeys.length ||
    actualAuditConfigKeys.some(
      (key, index) => key !== allowedAuditConfigKeys[index]
    )
  ) {
    fail("audit-ci config contains unauthorized settings");
  }

  if (auditConfig.high !== true) {
    fail("audit-ci high severity gate must remain enabled");
  }

  if (!Array.isArray(auditConfig.allowlist) || auditConfig.allowlist.length !== 0) {
    fail("retired ATVE requires empty audit-ci allowlist");
  }

  // Defense in depth: never retire an exception while the tracked advisory remains vulnerable.
  const lockfile = readJson("package-lock.json");
  if (lockfile) {
    const entries = Object.entries(lockfile.packages ?? {}).filter(
      ([name]) => /^node_modules\/(?:.*\/node_modules\/)?@grpc\/grpc-js$/.test(name)
    );
    if (entries.length === 0) fail("no @grpc/grpc-js entries found in lockfile");
    for (const [name, pkg] of entries) {
      const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg?.version ?? "");
      if (!m) {
        fail(`invalid grpc-js version at ${name}`);
        continue;
      }
      const [major, minor, patch] = m.slice(1).map(Number);
      const patched = major > 1 || (major === 1 && (
        minor > 14 || (minor === 14 && patch >= 5) || (minor === 13 && patch >= 6)
      ));
      if (!patched) fail(`vulnerable grpc-js at ${name}: ${pkg.version}`);
    }
  }

  if (!process.exitCode) {
    console.log("ATVE_RETIRED_PASS: ATVE-001 historical record retained; no active exceptions; grpc-js versions patched.");
  }
}

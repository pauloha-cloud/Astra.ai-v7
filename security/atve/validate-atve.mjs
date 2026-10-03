import fs from "node:fs";

const ATVE_FILE = "security/atve/ATVE-001.json";
const AUDIT_CONFIG_FILE = "audit-ci.json";

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

  if (atve.status !== "temporary") {
    fail("status must be temporary");
  }

  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(atve.advisory ?? "")) {
    fail("advisory must be a valid GHSA identifier");
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

  const created = parseStrictDate(atve.createdAt, "createdAt");
  const expires = parseStrictDate(atve.expiresAt, "expiresAt");

  if (created && expires && expires < created) {
    fail("expiresAt cannot be before createdAt");
  }

  if (expires) {
    const expirationBoundary = new Date(expires);
    expirationBoundary.setUTCHours(23, 59, 59, 999);

    if (Date.now() > expirationBoundary.getTime()) {
      fail(`ATVE expired on ${atve.expiresAt}`);
    }
  }

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

  if (!Array.isArray(auditConfig.allowlist)) {
    fail("audit-ci allowlist must be an array");
  } else if (Array.isArray(atve.dependencyPaths)) {
    const atvePaths = [...atve.dependencyPaths].sort();
    const auditPaths = [...auditConfig.allowlist].sort();

    if (
      atvePaths.length !== auditPaths.length ||
      atvePaths.some((path, index) => path !== auditPaths[index])
    ) {
      fail("audit-ci allowlist does not exactly match ATVE dependencyPaths");
    }
  }

  if (!process.exitCode) {
    console.log(
      `ATVE_PASS: ${atve.id} valid through ${atve.expiresAt}; ` +
      `${atve.dependencyPaths.length} exact dependency paths authorized.`
    );
  }
}

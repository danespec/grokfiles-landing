// SEC-PATH-LEAK-001 regression tests.
//
// Verifies that sanitizePublicSearchValue redacts internal filesystem paths
// whether standalone or embedded in longer strings, while preserving
// legitimate EFTA identifiers, public URLs, and evidence links.
//
// Coverage:
//   - Standalone Unix paths (/Volumes/, /Users/, /mnt/, /volume0/)
//   - Embedded Unix paths (e.g. "SourcePDF: /Volumes/.../file.pdf")
//   - PDF, TXT, JSON, DOCX extensions
//   - Extensionless paths
//   - Windows paths (C:\..., D:\...), standalone and embedded
//   - Nested JSON fields (paths in nested objects/arrays)
//   - Multiple paths in a single string
//   - Preserved: EFTA IDs, https:// URLs, /archive/ paths, /evidence-data/ paths
//
// Run: node tests/test_path_leak.mjs   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");

function extractFn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const parenEnd = source.indexOf(")", start);
  let i = source.indexOf("{", parenEnd);
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === "{") depth++;
    else if (source[j] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

// Extract PUBLIC_SEARCH_PRIVATE_FIELDS constant.
const privateFieldsMatch = src.match(/const PUBLIC_SEARCH_PRIVATE_FIELDS = new Set\(\[([\s\S]*?)\]\);/);
if (!privateFieldsMatch) throw new Error("PUBLIC_SEARCH_PRIVATE_FIELDS not found");

const loader = new Function(
  [
    `function publicSearchCleanString(s){ return String(s).trim().replace(/\\s+/g, " "); }`,
    `const PUBLIC_SEARCH_PRIVATE_FIELDS = new Set([${privateFieldsMatch[1]}]);`,
    extractFn(src, "sanitizePublicSearchValue"),
    `return { sanitizePublicSearchValue };`,
  ].join("\n")
);
const { sanitizePublicSearchValue } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};
const hasPath = (s) =>
  s != null &&
  (String(s).includes("/Volumes/") ||
    String(s).includes("/Users/") ||
    String(s).includes("/mnt/") ||
    /\/volume\d+\//i.test(String(s)) ||
    String(s).includes("/homes/") ||
    /[A-Za-z]:\\/.test(String(s)));

// --- 1. Standalone Unix paths (existing behavior: return undefined) ---
t("standalone /Volumes/ -> undefined", sanitizePublicSearchValue("/Volumes/homes/admin/file.pdf") === undefined);
t("standalone /Users/ -> undefined", sanitizePublicSearchValue("/Users/admin/doc.txt") === undefined);
t("standalone /mnt/ -> undefined", sanitizePublicSearchValue("/mnt/data/file.json") === undefined);
t("standalone /volume0/ -> undefined", sanitizePublicSearchValue("/volume0/docs/f.docx") === undefined);

// --- 2. Embedded Unix paths (SEC-PATH-LEAK-001: must redact) ---
{
  const out = sanitizePublicSearchValue("SourcePDF: /Volumes/homes/admin/DOJ_Epstein/_incoming/test.pdf");
  t("embedded /Volumes/ redacted", !hasPath(out), out);
  t("embedded /Volumes/ preserves prefix", out.includes("SourcePDF:"));
}
{
  const out = sanitizePublicSearchValue("See /Users/admin/documents/report.txt for details");
  t("embedded /Users/ redacted", !hasPath(out), out);
}
{
  const out = sanitizePublicSearchValue("Data at /mnt/archive/data.json and more text");
  t("embedded /mnt/ redacted", !hasPath(out), out);
}

// --- 3. File extensions: PDF, TXT, JSON, DOCX ---
for (const ext of ["pdf", "txt", "json", "docx"]) {
  const out = sanitizePublicSearchValue(`File: /Volumes/data/doc.${ext} end`);
  t(`embedded .${ext} path redacted`, !hasPath(out), out);
}

// --- 4. Extensionless paths ---
{
  const out = sanitizePublicSearchValue("Path: /Volumes/homes/admin/DOJ_Epstein/_incoming (no extension)");
  t("extensionless path redacted", !hasPath(out), out);
}

// --- 5. Windows paths ---
t("standalone C:\\ -> undefined", sanitizePublicSearchValue("C:\\Users\\admin\\file.pdf") === undefined);
{
  const out = sanitizePublicSearchValue("Location: D:\\data\\archive\\doc.docx here");
  t("embedded Windows path redacted", !hasPath(out), out);
}

// --- 6. Nested JSON fields ---
{
  const input = {
    title: "Test",
    nested: {
      summary: "Source: /Volumes/homes/admin/file.pdf",
      deep: { path: "/Users/admin/secret.txt" },
    },
    list: ["ok", "File at /mnt/data/x.json"],
  };
  const out = sanitizePublicSearchValue(input);
  const flat = JSON.stringify(out);
  t("nested paths redacted", !hasPath(flat), flat.slice(0, 100));
  t("nested legitimate fields preserved", out.title === "Test" && out.list[0] === "ok");
}

// --- 7. Multiple paths in single string ---
{
  const out = sanitizePublicSearchValue("First /Volumes/a/b.pdf then /Users/c/d.txt end");
  t("multiple paths redacted", !hasPath(out), out);
  t("multiple paths preserves text", out.includes("First") && out.includes("then") && out.includes("end"));
}

// --- 8. Preserved: legitimate identifiers and public links ---
t("EFTA ID preserved", sanitizePublicSearchValue("EFTA00000001") === "EFTA00000001");
{
  const out = sanitizePublicSearchValue("See https://grokarchivehub.com/archive/EFTA00000001 for details");
  t("https URL preserved", out.includes("https://grokarchivehub.com/archive/EFTA00000001"), out);
}
{
  const out = sanitizePublicSearchValue("Read at /archive/EFTA00000001");
  t("/archive/ path preserved", out.includes("/archive/EFTA00000001"), out);
}
{
  const out = sanitizePublicSearchValue("Evidence: /evidence-data/report.json");
  t("/evidence-data/ path preserved", out.includes("/evidence-data/report.json"), out);
}

// --- Backend container path roots (GAH wiki runtime defense in depth) ---
for (const root of ["doj", "var", "tmp", "root"]) {
  t("standalone /" + root + "/ path omitted",
    sanitizePublicSearchValue("/" + root + "/private/archive.txt") === undefined);
  const cleaned = sanitizePublicSearchValue("Raw reference /" + root + "/private/archive.txt retained ID EFTA00500001");
  t("embedded /" + root + "/ redacted",
    !cleaned.includes("/" + root + "/") && cleaned.includes("EFTA00500001"));
}
t("public source reader preserved",
  sanitizePublicSearchValue("/api/source?id=EFTA00500001") === "/api/source?id=EFTA00500001");
t("public PDF reader preserved",
  sanitizePublicSearchValue("/pdf-lite?id=EFTA00500001") === "/pdf-lite?id=EFTA00500001");

// --- 9. Unexpected upstream content types (defense in depth) ---
t("null -> null", sanitizePublicSearchValue(null) === null);
t("number passthrough", sanitizePublicSearchValue(42) === 42);
t("boolean passthrough", sanitizePublicSearchValue(true) === true);
{
  // HTML content with embedded path
  const out = sanitizePublicSearchValue("<p>Source: /Volumes/x/y.pdf</p>");
  t("HTML with path redacted", !hasPath(out), out);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

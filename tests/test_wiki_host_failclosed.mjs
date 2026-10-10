// Unit tests for the staging wiki-host fail-closed behavior.
//
// wikiHost(env) must NEVER silently fall back to the production wiki host
// when GAH_STAGING=true. It throws instead; proxyProofLayer converts the
// throw into a 503 (wiki_host_unconfigured).
//
// Run: node tests/test_wiki_host_failclosed.mjs   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");

function extractFn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in _worker.js`);
  let i = source.indexOf("{", start);
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

const wikiHost = new Function(
  'const WIKI_HOST = "wiki.grokarchivehub.com";\n' +
    extractFn(src, "wikiHost") +
    "\nreturn wikiHost;"
)();

let pass = 0,
  fail = 0;
const t = (name, cond) => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name);
};
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch (_) {
    return true;
  }
};

t("no env -> production host (production behavior unchanged)", wikiHost(undefined) === "wiki.grokarchivehub.com");
t("empty env -> production host", wikiHost({}) === "wiki.grokarchivehub.com");
t("valid override honored", wikiHost({ GAH_WIKI_HOST: "mock-wiki.example.org" }) === "mock-wiki.example.org");
t("override case-insensitive, trimmed", wikiHost({ GAH_WIKI_HOST: "  Mock-Wiki.Example.ORG " }) === "mock-wiki.example.org");
t("staging + valid override -> override", wikiHost({ GAH_STAGING: "true", GAH_WIKI_HOST: "mock.internal" }) === "mock.internal");
t("staging without override THROWS (fail closed)", throws(() => wikiHost({ GAH_STAGING: "true" })));
t("staging with invalid override THROWS (fail closed)", throws(() => wikiHost({ GAH_STAGING: "true", GAH_WIKI_HOST: "not a host!!" })));
t("staging with URL-scheme override THROWS", throws(() => wikiHost({ GAH_STAGING: "true", GAH_WIKI_HOST: "https://evil.example/x" })));
t("invalid override without staging -> production fallback (unchanged)", wikiHost({ GAH_WIKI_HOST: "not a host!!" }) === "wiki.grokarchivehub.com");
t("GAH_STAGING=false without override -> production fallback", wikiHost({ GAH_STAGING: "false" }) === "wiki.grokarchivehub.com");

// The 503 conversion lives in proxyProofLayer's try/catch around wikiHost;
// assert the wiring exists.
t("proxyProofLayer catches wikiHost failure as 503", src.includes('error: "wiki_host_unconfigured"') && src.includes("status: 503"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
import { buildVideoArtifacts, REGISTRY_PATH } from "./video-registry-lib.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  const key = value.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, "true");
  }
}

const root = args.get("root") || process.cwd();
const checkOnly = args.get("check") === "true" || args.get("check-only") === "true";
const result = buildVideoArtifacts(root, {
  checkOnly,
  registryPath: args.get("registry") || REGISTRY_PATH
});

if (!result.ok) {
  console.error(JSON.stringify({
    ok: false,
    mode: checkOnly ? "check" : "write",
    errors: result.errors
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mode: checkOnly ? "check" : "write",
  changed: result.changed,
  publishedVideos: result.videos?.length || 0
}, null, 2));

#!/usr/bin/env node
import fs from "node:fs";
import { authStatus, credentialPaths, jsonResult, loadGoogleApis, readJsonFile, parseArgs } from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const status = authStatus();

if (!execute) {
  jsonResult({
    ok: true,
    dryRun: true,
    status: status.status,
    message: "OAuth bootstrap is dormant by default. Re-run with --execute to print an authorization URL without opening a browser.",
    command: "node scripts/youtube/oauth-bootstrap.mjs --execute"
  });
}

if (!status.clientPresent) {
  jsonResult({ ok: false, status: "CLIENT_SECRET_MISSING", clientPath: status.clientPath }, 1);
}

if (status.tokenPresent && args.get("force") !== "true") {
  jsonResult({ ok: true, status: "TOKEN_PRESENT", tokenPath: status.tokenPath, message: "Existing token file detected; not replacing it." });
}

const paths = credentialPaths();
const { google } = await loadGoogleApis();
const clientJson = readJsonFile(paths.clientPath);
const installed = clientJson.installed || clientJson.web || {};
const client = new google.auth.OAuth2(
  installed.client_id,
  installed.client_secret,
  (installed.redirect_uris || ["http://localhost"])[0]
);
const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.upload"]
});

jsonResult({
  ok: false,
  status: "AUTHORIZATION_REQUIRED",
  expectedGoogleAccount: status.expectedGoogleAccount,
  authUrl,
  nextStep: "Open authUrl locally, approve with the expected account, then exchange the code with a reviewed local token helper. Do not paste authorization codes into shared logs.",
  tokenPath: paths.tokenPath,
  tokenDirectoryPresent: fs.existsSync(paths.tokenPath.split("/").slice(0, -1).join("/"))
});

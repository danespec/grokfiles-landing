#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  authStatus,
  authorizationUrl,
  credentialPaths,
  exchangeCodeForToken,
  jsonResult,
  loopbackRedirectUri,
  parseArgs,
  requireInstalledDesktopClient,
  saveOAuthToken
} from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const status = authStatus();
const authUrlFile = args.get("auth-url-file") || path.join(os.tmpdir(), "gah-youtube-auth-url.txt");

if (!execute) {
  jsonResult({
    ok: true,
    dryRun: true,
    status: status.status,
    message: "OAuth bootstrap is dormant by default. Re-run with --execute to start the localhost browser callback.",
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
const { localhostRedirect } = requireInstalledDesktopClient();
const state = crypto.randomBytes(24).toString("hex");

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    if (requestUrl.pathname !== server.expectedPathname) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    if (requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("State mismatch. Return to Codex for the sanitized error.");
      console.log(JSON.stringify({ ok: false, status: "OAUTH_STATE_MISMATCH" }, null, 2));
      server.close();
      return;
    }
    const error = requestUrl.searchParams.get("error");
    if (error) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Authorization was not completed. Return to Codex for the sanitized error.");
      console.log(JSON.stringify({ ok: false, status: "OAUTH_DENIED", error }, null, 2));
      server.close();
      return;
    }
    const code = requestUrl.searchParams.get("code");
    if (!code) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Authorization code missing. Return to Codex for the sanitized error.");
      console.log(JSON.stringify({ ok: false, status: "OAUTH_CODE_MISSING" }, null, 2));
      server.close();
      return;
    }
    const token = await exchangeCodeForToken(code, server.redirectUri);
    const saved = await saveOAuthToken(token);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Grok Archive Hub authorization complete</title><h1>Authorization complete</h1><p>You can return to Codex.</p>");
    console.log(JSON.stringify({
      ok: true,
      status: "TOKEN_STORED",
      expectedGoogleAccount: status.expectedGoogleAccount,
      tokenPath: saved.tokenPath,
      tokenPermissions: saved.tokenPermissions,
      refreshTokenPresent: saved.refreshTokenPresent,
      grantedScopes: saved.grantedScopes
    }, null, 2));
    server.close();
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Authorization callback failed. Return to Codex for the sanitized error.");
    console.log(JSON.stringify({
      ok: false,
      status: error.message || "OAUTH_CALLBACK_FAILED",
      apiStatus: error.statusCode,
      apiError: error.description || ""
    }, null, 2));
    server.close();
  }
});

server.on("error", (error) => {
  console.log(JSON.stringify({ ok: false, status: "LOCALHOST_LISTENER_FAILED", error: error.code || error.message }, null, 2));
  process.exit(1);
});

const registered = new URL(localhostRedirect);
const requestedPort = registered.port ? Number(registered.port) : 0;
server.listen(requestedPort, registered.hostname, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  server.redirectUri = loopbackRedirectUri(localhostRedirect, port);
  server.expectedPathname = new URL(server.redirectUri).pathname;
  const authUrl = authorizationUrl({ redirectUri: server.redirectUri, state });
  fs.writeFileSync(authUrlFile, authUrl, { mode: 0o600 });
  fs.chmodSync(authUrlFile, 0o600);
  console.log(JSON.stringify({
    ok: false,
    status: "AUTHORIZATION_PENDING",
    expectedGoogleAccount: status.expectedGoogleAccount,
    tokenPath: paths.tokenPath,
    tokenDirectoryPresent: fs.existsSync(path.dirname(paths.tokenPath)),
    authUrlFile,
    redirectHost: registered.hostname,
    listenerActive: true
  }, null, 2));
});

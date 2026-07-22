#!/usr/bin/env node
import { authStatus, jsonResult, verifyChannel } from "./youtube-lib.mjs";

const status = authStatus();
if (status.status !== "TOKEN_PRESENT") {
  jsonResult({
    ok: false,
    status: "AUTHORIZATION_REQUIRED",
    tokenPresent: status.tokenPresent,
    bootstrapCommand: status.bootstrapCommand
  }, status.clientPresent ? 0 : 1);
}

try {
  const result = await verifyChannel();
  jsonResult(result, result.ok ? 0 : 1);
} catch (error) {
  jsonResult({ ok: false, status: error.message || "VERIFY_CHANNEL_FAILED", bootstrapCommand: error.status?.bootstrapCommand }, 1);
}

#!/usr/bin/env node
import { authStatus, jsonResult } from "./youtube-lib.mjs";

const status = authStatus();
jsonResult({
  ok: status.status === "TOKEN_PRESENT",
  status: status.status,
  expectedGoogleAccount: status.expectedGoogleAccount,
  clientPath: status.clientPath,
  clientPresent: status.clientPresent,
  tokenPath: status.tokenPath,
  tokenPresent: status.tokenPresent,
  ...(status.tokenPresent ? {} : { bootstrapCommand: status.bootstrapCommand })
}, status.clientPresent ? 0 : 1);

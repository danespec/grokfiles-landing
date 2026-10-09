/**
 * gah_identifiers.js — canonical EFTA / Barak identifier resolution.
 *
 * JS port of docs/phase0/search-contract-tests/gah_search.py (the contract
 * reference implementation, §2 and §7). Semantics are intentionally identical;
 * tests/test_identifiers.mjs pins the behavior against the same 37 checks.
 *
 * EFTA records and Barak archive records are separate collections with
 * separate identifier namespaces. This module enforces the separation:
 * classifyQuery() tells the caller which collection an identifier belongs
 * to, and missingRecordResponse() builds the §7 cross-collection hint
 * instead of silence.
 *
 * Pure functions only — no I/O, no Worker APIs. Usable from the Pages
 * worker, the rate-limiter worker, and Node test harnesses.
 */

export const EFTA_CANONICAL = /^EFTA\d{8}$/;
export const BARAK_CANONICAL = /^BARAK-\d{3}-\d{3}$/;

/**
 * Normalize to canonical EFTA + 8 digits, or null.
 * Contract §2.1: strip whitespace/separators, uppercase, pad digit run to 8.
 */
export function normalizeEfta(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase().replace(/[\s\-_.]/g, "");
  const m = /^EFTA(\d{1,8})$/.exec(s);
  if (!m) return null;
  return "EFTA" + m[1].padStart(8, "0");
}

/**
 * Normalize to canonical BARAK-XXX-XXX, or null.
 * Contract §2.2: exactly two digit groups; separators required between
 * groups (a bare 'BARAK-174' is rejected, not split). An unseparated
 * 6-digit run is split 3+3 ('BARAK174001' -> 'BARAK-174-001').
 */
export function normalizeBarak(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  let m = /^BARAK(\d{6})$/.exec(s);
  if (m) {
    const d = m[1];
    return `BARAK-${d.slice(0, 3)}-${d.slice(3)}`;
  }
  const t = s.replace(/[\s_.]+/g, "-").replace(/-{2,}/g, "-");
  m = /^BARAK-(\d{1,3})-(\d{1,3})$/.exec(t);
  if (!m) return null;
  return `BARAK-${m[1].padStart(3, "0")}-${m[2].padStart(3, "0")}`;
}

/**
 * Classify a raw query string.
 * Returns { kind: "efta" | "barak" | "text", canonical }.
 */
export function classifyQuery(raw) {
  const efta = normalizeEfta(raw);
  if (efta) return { kind: "efta", canonical: efta };
  const barak = normalizeBarak(raw);
  if (barak) return { kind: "barak", canonical: barak };
  return { kind: "text", canonical: typeof raw === "string" ? raw.trim() : "" };
}

/**
 * Build the §7 missing-record response row. Never returns silence.
 * kind: "efta" | "barak" | "text"; searched_collection names the collection
 * that was actually searched ("efta" | "barak").
 */
export function missingRecordResponse(kind, identifier, searchedCollection) {
  if (kind === "barak" && searchedCollection === "efta") {
    return {
      result_type: "missing_record",
      collection: "efta",
      collection_hint: "barak",
      message: `${identifier} is not an EFTA record \u2014 it belongs to the Barak email archive.`,
      suggested_route: "/barak/search?receipt=",
    };
  }
  if (kind === "efta" && searchedCollection === "barak") {
    return {
      result_type: "missing_record",
      collection: "barak",
      collection_hint: "efta",
      message: `${identifier} is not a Barak archive record \u2014 it is a DOJ release document.`,
      suggested_route: `/archive/${identifier}`,
    };
  }
  if (kind === "efta") {
    return {
      result_type: "missing_record",
      collection: searchedCollection,
      collection_hint: "efta",
      message: `No EFTA record ${identifier} in the public index. The DOJ release may hold material not yet indexed.`,
      suggested_route: null,
    };
  }
  if (kind === "barak") {
    return {
      result_type: "missing_record",
      collection: searchedCollection,
      collection_hint: "barak",
      message: `No Barak archive record ${identifier}. Recovered parents and open slots are listed on /barak.`,
      suggested_route: "/barak",
    };
  }
  return {
    result_type: "missing_record",
    collection: searchedCollection,
    collection_hint: null,
    message: "No records matched. Identifiers look like EFTA00033413 or BARAK-174-001.",
    suggested_route: null,
  };
}

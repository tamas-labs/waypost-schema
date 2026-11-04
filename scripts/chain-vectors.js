#!/usr/bin/env node
// Reference generator of chain/test-vectors.json: chain entry → RFC 8785 canonical JSON → HMAC-SHA256.
// Deterministic: no clock, no randomness. Usage:
//   node scripts/chain-vectors.js          write chain/test-vectors.json
//   node scripts/chain-vectors.js --check  exit 1 if the file differs from what would be written

import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson } from './jcs.js';

export const VECTORS_FILE = resolve(fileURLToPath(import.meta.url), '..', '..', 'chain', 'test-vectors.json');

/** Fixed 32-byte test key: bytes 0x00, 0x01, …, 0x1f. Never use it outside tests. */
export const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
export const GENESIS_PREV_HASH = '0'.repeat(64);
const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/** The entry's hash: lowercase hex HMAC-SHA256 over the canonical JSON (UTF-8) of the entry without "hash". */
export function entryHash(input, key = KEY) {
  if ('hash' in input) throw new Error('the HMAC input must not contain "hash"');
  return createHmac('sha256', key).update(canonicalJson(input), 'utf8').digest('hex');
}

const id = (n) => `019a2b3c-4d5e-7f00-8a00-${String(n).padStart(12, '0')}`;
const DEVICE = id(4), SITE = id(1), GUARD = id(3), CP = id(5), CP_QR = id(6), RV = id(8), SCHED = id(9),
  SHIFT = id(20), ROUND = id(21), SCAN = id(22), INCIDENT = id(23), MEDIA1 = id(24), MEDIA2 = id(25);
const SHA_A = '677e912d1a8aa1101fe271bab42c91be187bd6076ff1281335db85e3477f6ce1';
const SHA_B = 'b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184';

/** An entry without hash, keys in the specification's (non-alphabetical) order. */
function entry(fields) {
  return {
    id: fields.id,
    device_id: DEVICE,
    seq: fields.seq,
    type: fields.type,
    payload: fields.payload,
    device_time: fields.device_time,
    uptime_ms: fields.uptime_ms ?? 86400123,
    boot_id: fields.boot_id ?? 'android-17',
    gnss_time: fields.gnss_time ?? null,
    ref_server_time: 'ref_server_time' in fields ? fields.ref_server_time : '2026-10-27T19:58:02.511Z',
    ref_uptime_ms: 'ref_uptime_ms' in fields ? fields.ref_uptime_ms : 82500000,
    ref_boot_id: 'ref_boot_id' in fields ? fields.ref_boot_id : 'android-17',
    prev_hash: fields.prev_hash ?? 'a'.repeat(64),
  };
}

/** Recursively reverses key order, so a non-sorting implementation produces a different result. */
function reverseKeys(value) {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).reverse().map((k) => [k, reverseKeys(value[k])]));
  }
  return value;
}

const scanNfcPayload = {
  scan_id: SCAN, round_id: ROUND, checkpoint_id: CP, method: 'nfc', tag_uid: '04A1B2C3D4E580', qr_payload: null,
  ndef_raw: '0QEJVQJleGFtcGxlLmNvbQ==', lat_e7: 474979000, lng_e7: 190402000, accuracy_dm: 125,
  is_mock: false, flags: [], note: null, media: [],
};

const CASES = [
  {
    name: 'shift_started-first-entry',
    description: 'First entry of a chain before the first sync: seq 1, prev_hash is 64 zeros, gnss_time and the sync reference are null.',
    input: entry({
      id: id(100), seq: 1, type: 'shift_started', payload: { shift_id: SHIFT, guard_id: GUARD, site_id: SITE },
      device_time: '2026-10-27T19:55:00.000Z', uptime_ms: 82200000, prev_hash: GENESIS_PREV_HASH,
      ref_server_time: null, ref_uptime_ms: null, ref_boot_id: null,
    }),
  },
  {
    name: 'shift_closed-auto',
    description: 'Automatic shift close.',
    input: entry({ id: id(101), seq: 20, type: 'shift_closed', payload: { shift_id: SHIFT, closed_by: 'auto' }, device_time: '2026-10-28T08:20:00.000Z' }),
  },
  {
    name: 'round_opened-no-time-limit',
    description: 'Round without a time limit: null inside the payload.',
    input: entry({
      id: id(102), seq: 2, type: 'round_opened',
      payload: { round_id: ROUND, shift_id: SHIFT, route_version_id: RV, schedule_id: SCHED, scheduled_at: '2026-10-27T20:00:00.000Z', time_limit_min: null },
      device_time: '2026-10-27T20:00:00.412Z',
    }),
  },
  {
    name: 'scan-nfc-gnss-time',
    description: 'NFC scan with integer location, GNSS time and raw NDEF (base64).',
    input: entry({ id: id(103), seq: 3, type: 'scan', payload: scanNfcPayload, device_time: '2026-10-27T20:03:44.120Z', gnss_time: '2026-10-27T20:03:43.000Z' }),
  },
  {
    name: 'scan-qr-unknown-tag-nulls',
    description: 'Unknown QR code without location: most payload fields are null; empty media array.',
    input: entry({
      id: id(104), seq: 4, type: 'scan',
      payload: {
        ...scanNfcPayload, round_id: null, checkpoint_id: null, method: 'qr', tag_uid: null, qr_payload: 'waypost:cp:ismeretlen',
        ndef_raw: null, lat_e7: null, lng_e7: null, accuracy_dm: null, flags: ['unknown_tag'],
      },
      device_time: '2026-10-27T20:05:10.007Z',
    }),
  },
  {
    name: 'scan-manual-hungarian-and-emoji',
    description: 'Manual scan: Hungarian accented letters (must stay literal UTF-8, not \\u escapes) and non-BMP emoji (4-byte UTF-8, surrogate pair in UTF-16).',
    input: entry({
      id: id(105), seq: 5, type: 'scan',
      payload: {
        ...scanNfcPayload, method: 'manual', tag_uid: null, ndef_raw: null, flags: ['manual'],
        note: 'Árvíztűrő tükörfúrógép – ÁRVÍZTŰRŐ TÜKÖRFÚRÓGÉP; a címke leszakadt 🏷️❌, az ajtó zárva 🚪🔒.',
        media: [{ id: MEDIA1, sha256: SHA_A }],
      },
      device_time: '2026-10-27T20:09:30.500Z',
    }),
  },
  {
    name: 'incident-escaping-negative-coordinates',
    description: 'String escaping traps: newline, tab, quote, backslash, U+001F (\\u001f), slash and U+2028 (both literal in JCS; PHP escapes them by default) and an emoji; negative coordinates; two media items.',
    input: entry({
      id: id(106), seq: 6, type: 'incident',
      payload: {
        incident_id: INCIDENT, shift_id: SHIFT, category: 'other',
        note: 'Sor 1\nSor 2\t"idézet" \\ C:/raktár\u001f vége\u2028új sor 🧯',
        lat_e7: -338688000, lng_e7: 1512093000, accuracy_dm: 0, nearest_checkpoint_id: null, scan_id: null,
        media: [{ id: MEDIA1, sha256: SHA_A }, { id: MEDIA2, sha256: SHA_B }],
      },
      device_time: '2026-10-27T20:15:00.000Z',
    }),
  },
  {
    name: 'round_closed-missed',
    description: 'Round closed without any scan.',
    input: entry({
      id: id(107), seq: 7, type: 'round_closed',
      payload: { round_id: ROUND, status: 'missed', finished_at: '2026-10-27T20:20:00.000Z' },
      device_time: '2026-10-27T20:20:00.031Z',
    }),
  },
  {
    name: 'large-integers',
    description: 'Largest allowed integers (2^53 − 1) in seq, uptime_ms and ref_uptime_ms; serialized as plain digits, without exponent or quotes.',
    input: entry({
      id: id(108), seq: MAX_SAFE, type: 'round_closed',
      payload: { round_id: ROUND, status: 'completed', finished_at: '2026-10-27T20:14:05.120Z' },
      device_time: '2026-10-27T20:14:05.120Z', uptime_ms: MAX_SAFE, ref_uptime_ms: MAX_SAFE - 1,
    }),
  },
  {
    name: 'key-order-reversed-nested',
    description: 'Same kind of entry as scan-manual, but every object (entry, payload, media items) is given with its keys in reverse order; the canonical JSON sorts them at every level (note "ref_boot_id" < "ref_server_time" < "ref_uptime_ms" and "lat_e7" < "lng_e7").',
    input: reverseKeys(entry({
      id: id(109), seq: 8, type: 'scan',
      payload: {
        ...scanNfcPayload, round_id: null, is_mock: true, flags: ['out_of_round', 'mock_location'],
        media: [{ id: MEDIA2, sha256: SHA_B }],
      },
      device_time: '2026-10-27T21:00:00.000Z',
    })),
  },
];

// --- raw entry texts: what a verifier gets over the wire ------------------------------------------------------

/** The entry the raw texts are made of: non-ASCII text, a slash, \b \f U+0000, an emoji, a zero and large numbers. */
const RAW_BASE = entry({
  id: id(110), seq: 9, type: 'incident',
  payload: {
    incident_id: id(26), shift_id: SHIFT, category: 'open_door', note: 'Ázsió/fék\b\f\u0000 🚨',
    lat_e7: 474979000, lng_e7: 190402000, accuracy_dm: 0, nearest_checkpoint_id: CP, scan_id: null, media: [],
  },
  device_time: '2026-10-27T21:30:00.000Z', uptime_ms: 86400000,
});
const RAW_SIGNED = { ...RAW_BASE, hash: entryHash(RAW_BASE) };
/** RAW_SIGNED as compact JSON, keys in the specification's order. */
const RAW_TEXT = JSON.stringify(RAW_SIGNED);
const RAW_NOTE = JSON.stringify(RAW_BASE.payload.note);

/** text with every [from, to] replaced; each from must occur exactly once. */
function edit(text, ...replacements) {
  for (const [from, to] of replacements) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`"${from}" occurs ${count} times in the raw entry, expected once`);
    text = text.replace(from, () => to);
  }
  return text;
}

const hmacOfText = (text) => createHmac('sha256', KEY).update(text, 'utf8').digest('hex');
/** RAW_TEXT with its hash replaced by the HMAC of text: what a wrong canonicalization would send. */
const signedWithHashOf = (text, rawText = RAW_TEXT) => edit(rawText, [`"hash":"${RAW_SIGNED.hash}"`, `"hash":"${hmacOfText(text)}"`]);

/** Raw texts of RAW_SIGNED written differently: decoding them gives the same entry, so the same canonical JSON and hash. */
const NORMALIZED = [
  {
    name: 'integers-written-as-floats',
    description: 'Integers with a fraction or an exponent (9.0, 8.64e7, 4749790E2) and minus zero (-0.0): JSON Schema integers, and the canonical JSON writes them as plain integers. PHP json_decode() reads them as floats; they must be turned back into integers before canonicalization, not rejected.',
    entry_json: edit(RAW_TEXT, ['"seq":9,', '"seq":9.0,'], [',"uptime_ms":86400000,', ',"uptime_ms":8.64e7,'], ['"lat_e7":474979000,', '"lat_e7":4749790E2,'], ['"accuracy_dm":0,', '"accuracy_dm":-0.0,']),
  },
  {
    name: 'escaped-strings',
    description: 'The note written with escapes: \\u00c1 and \\u00F3 for accented letters, \\/ for the slash, \\u0008 \\u000C for \\b \\f, and a surrogate pair escape (\\ud83d\\udea8) for the emoji. The canonical JSON has the letters, the slash and the emoji literally, and writes \\b \\f \\u0000.',
    entry_json: edit(RAW_TEXT, [RAW_NOTE, '"\\u00c1zsi\\u00F3\\/f\\u00e9k\\u0008\\u000C\\u0000 \\ud83d\\udea8"']),
  },
  {
    name: 'whitespace-and-key-order',
    description: 'Pretty-printed with CRLF line ends, every object with its keys in reverse order, hash first.',
    entry_json: JSON.stringify(reverseKeys(RAW_SIGNED), null, 2).replaceAll('\n', '\r\n'),
  },
];

/**
 * Raw texts a verifier must refuse: "invalid" = not a valid chain entry, or one that cannot be canonicalized (the
 * push is a 422 validation_failed); "bad_hmac" = a valid entry whose hash is not the HMAC of its canonical JSON
 * (the push rejects the entry with bad_hmac).
 */
const INVALID = [
  {
    name: 'fractional-integer',
    description: 'seq is 9.5: not an integer.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, ['"seq":9,', '"seq":9.5,']),
  },
  {
    name: 'fractional-coordinate',
    description: 'lat_e7 is 474979000.5: no floating-point number in hashed data.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, ['"lat_e7":474979000,', '"lat_e7":474979000.5,']),
  },
  {
    name: 'integer-above-2^53-1',
    description: 'uptime_ms is 2^53 = 9007199254740992: outside ±(2^53 − 1); a JS number cannot tell it from 2^53 + 1.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, [',"uptime_ms":86400000,', ',"uptime_ms":9007199254740992,']),
  },
  {
    name: 'number-overflow',
    description: 'uptime_ms is 1e400: Infinity in JS, INF in PHP.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, [',"uptime_ms":86400000,', ',"uptime_ms":1e400,']),
  },
  {
    name: 'lone-surrogate',
    description: 'The note ends in a lone high surrogate escape (\\ud83d): not valid Unicode (I-JSON). JSON.parse() accepts it, PHP json_decode() does not; the result is a rejection either way.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, [RAW_NOTE, '"Ázsió/fék \\ud83d"']),
  },
  {
    name: 'missing-null-field',
    description: 'gnss_time is left out instead of being null: every field of a chain entry is required.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, ['"gnss_time":null,', '']),
  },
  {
    name: 'extra-field',
    description: 'An extra field (the app\'s local synced_at): a chain entry has no other fields.',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, ['"prev_hash":', '"synced_at":"2026-10-27T21:31:00.000Z","prev_hash":']),
  },
  {
    name: 'empty-payload',
    description: 'payload is {}: not a valid payload. (PHP json_decode(..., true) would make it [], which canonicalizes differently from {}.)',
    expected: 'invalid',
    entry_json: edit(RAW_TEXT, [`"payload":${JSON.stringify(RAW_BASE.payload)}`, '"payload":{}']),
  },
  {
    name: 'hash-of-unsorted-json',
    description: 'hash is the HMAC of the entry without hash as JSON with its keys in the specification\'s order, not sorted.',
    expected: 'bad_hmac',
    entry_json: signedWithHashOf(JSON.stringify(RAW_BASE)),
  },
  {
    name: 'hash-of-escaped-json',
    description: 'hash is the HMAC of the canonical JSON as PHP json_encode() writes it with its default flags: the slash as \\/, non-ASCII as \\u escapes.',
    expected: 'bad_hmac',
    entry_json: signedWithHashOf(
      canonicalJson(RAW_BASE).replaceAll('/', '\\/').replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`),
    ),
  },
  {
    name: 'hash-of-float-text',
    description: 'seq is written as 9.0, and hash is the HMAC of a canonical JSON with "seq":9.0 (json_encode() of the float PHP decoded): the canonical JSON has "seq":9.',
    expected: 'bad_hmac',
    entry_json: signedWithHashOf(edit(canonicalJson(RAW_BASE), ['"seq":9,', '"seq":9.0,']), edit(RAW_TEXT, ['"seq":9,', '"seq":9.0,'])),
  },
];

/**
 * The reference verifier of a raw entry text: decode, validate (validate: a chain/entry.json validator, e.g. Ajv),
 * canonicalize without hash, compare the HMAC. Returns { result: 'ok', canonical_json, hash } or { result: 'invalid' }
 * or { result: 'bad_hmac' }, as the normalized and invalid vectors expect.
 */
export function verifyEntryJson(text, validate, key = KEY) {
  let entry, canonical;
  try {
    entry = JSON.parse(text);
    if (!validate(entry)) return { result: 'invalid' };
    const { hash: _hash, ...unsigned } = entry;
    canonical = canonicalJson(unsigned);
  } catch {
    return { result: 'invalid' };
  }
  const hash = createHmac('sha256', key).update(canonical, 'utf8').digest('hex');
  return hash === entry.hash ? { result: 'ok', canonical_json: canonical, hash } : { result: 'bad_hmac' };
}

/** A three-entry chain: each prev_hash is the hash of the previous entry, the first is 64 zeros. */
function buildChain() {
  const specs = [
    { id: id(200), type: 'shift_started', payload: { shift_id: SHIFT, guard_id: GUARD, site_id: SITE }, device_time: '2026-10-27T19:55:00.000Z', uptime_ms: 82200000 },
    { id: id(201), type: 'round_opened', payload: { round_id: ROUND, shift_id: SHIFT, route_version_id: RV, schedule_id: SCHED, scheduled_at: '2026-10-27T20:00:00.000Z', time_limit_min: 20 }, device_time: '2026-10-27T20:00:00.412Z', uptime_ms: 82500412 },
    { id: id(202), type: 'scan', payload: { ...scanNfcPayload, checkpoint_id: CP_QR, method: 'qr', tag_uid: null, ndef_raw: null, qr_payload: `waypost:cp:${CP_QR}:aB3dE5gH7jK9mN2p` }, device_time: '2026-10-27T20:03:44.120Z', uptime_ms: 82724120 },
  ];
  let prevHash = GENESIS_PREV_HASH;
  return specs.map((spec, i) => {
    const input = entry({ ...spec, seq: i + 1, prev_hash: prevHash });
    const vector = { input, canonical_json: canonicalJson(input), hash: entryHash(input) };
    prevHash = vector.hash;
    return vector;
  });
}

export function buildVectors() {
  return {
    description: 'Waypost chain test vectors. For every vector of cases and chain: canonical_json = RFC 8785 (JCS) of input; hash = lowercase hex HMAC-SHA256(key, UTF-8 bytes of canonical_json). input is a chain entry without its "hash" property; input + hash is a valid chain/entry.json instance. Generated by scripts/chain-vectors.js; do not edit by hand.',
    key_base64: KEY.toString('base64'),
    key_hex: KEY.toString('hex'),
    cases: CASES.map(({ name, description, input }) => ({
      name, description, input, canonical_json: canonicalJson(input), hash: entryHash(input),
    })),
    chain: {
      description: 'Three consecutive entries of one device: seq 1..3, prev_hash of seq 1 is 64 zeros, every further prev_hash is the hash of the previous entry.',
      entries: buildChain(),
    },
    normalized: {
      description: 'Raw JSON texts of one signed chain entry (with hash), as a verifier receives them, written in ways that decode to the same entry. A verifier decodes entry_json, validates it against chain/entry.json, and computes the HMAC of the canonical JSON without hash: the result is canonical_json and hash, and hash equals the one in entry_json.',
      cases: NORMALIZED.map(({ name, description, entry_json }) => ({
        name, description, entry_json, canonical_json: canonicalJson(RAW_BASE), hash: RAW_SIGNED.hash,
      })),
    },
    invalid: {
      description: 'Raw JSON texts of signed chain entries a verifier must refuse. expected "invalid": the text does not decode to a valid chain/entry.json instance, or the entry cannot be canonicalized (push: 422 validation_failed); expected "bad_hmac": a valid entry whose hash is not the HMAC of its canonical JSON (push: rejected with bad_hmac).',
      cases: INVALID.map(({ name, description, expected, entry_json }) => ({ name, description, expected, entry_json })),
    },
  };
}

/** The exact file content: 2-space indented JSON with literal (unescaped) non-ASCII text, trailing newline. */
export function renderVectors() {
  return `${JSON.stringify(buildVectors(), null, 2)}\n`;
}

function main(argv) {
  const content = renderVectors();
  if (argv.includes('--check')) {
    let current = null;
    try {
      current = readFileSync(VECTORS_FILE, 'utf8');
    } catch {
      // missing file is reported below
    }
    if (current !== content) {
      console.error('chain/test-vectors.json is out of date; run: npm run vectors:chain');
      return 1;
    }
    console.log('chain/test-vectors.json is up to date');
    return 0;
  }
  writeFileSync(VECTORS_FILE, content);
  console.log('wrote chain/test-vectors.json');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

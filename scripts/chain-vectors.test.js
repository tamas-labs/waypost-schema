import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { CanonicalJsonError, canonicalJson } from './jcs.js';
import { GENESIS_PREV_HASH, VECTORS_FILE, buildVectors, entryHash, renderVectors } from './chain-vectors.js';
import { SCHEMA_ID_BASE, createAjv } from './validate.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const fileContent = readFileSync(VECTORS_FILE, 'utf8');
const vectors = JSON.parse(fileContent);
const allVectors = [...vectors.cases, ...vectors.chain.entries];

describe('canonicalJson (RFC 8785, integers only)', () => {
  test('sorts keys by UTF-16 code units at every level, without whitespace', () => {
    assert.equal(canonicalJson({ b: [{ z: 1, a: null }], a: { d: true, c: 'x' } }), '{"a":{"c":"x","d":true},"b":[{"a":null,"z":1}]}');
    // "_" (U+005F) sorts before lowercase letters, "é" (U+00E9) after "z".
    assert.equal(canonicalJson({ z: 1, é: 2, a_b: 3, ab: 4 }), '{"a_b":3,"ab":4,"z":1,"é":2}');
    // UTF-16 code units, not code points: U+1F600 (surrogates D83D DE00) sorts before U+FB33,
    // although its code point is larger. Sorting by code point or by UTF-8 bytes gets this wrong.
    assert.equal(canonicalJson({ '\uFB33': 2, '\u{1F600}': 1 }), '{"\u{1F600}":1,"\uFB33":2}');
  });

  test('escapes strings exactly like RFC 8785', () => {
    assert.equal(canonicalJson('"\\/\b\f\n\r\t\u0000\u001f\u007f\u2028é😀'), '"\\"\\\\/\\b\\f\\n\\r\\t\\u0000\\u001f\u007f\u2028é😀"');
  });

  test('serializes integers as plain digits', () => {
    assert.equal(canonicalJson([0, -0, -1, 9007199254740991, -9007199254740991]), '[0,0,-1,9007199254740991,-9007199254740991]');
  });

  test('rejects floats, unsafe integers, lone surrogates and non-JSON values', () => {
    for (const bad of [1.5, 47.4979, 1e21, 9007199254740992, NaN, Infinity, '\ud800', { '\udc00': 1 }, undefined, () => 1, 10n, new Date(0), { a: undefined }]) {
      assert.throws(() => canonicalJson(bad), CanonicalJsonError, `expected rejection of ${String(bad)}`);
    }
  });

  test('matches the independent canonicalize package on the vectors and on mixed data', () => {
    for (const v of allVectors) assert.equal(canonicalJson(v.input), canonicalize(v.input), v.name);
    const mixed = { 'é': ['\u2028', '\u001f', '"\\'], nested: { b: { d: [], c: {} }, a: -42 }, '': null, Z: false };
    assert.equal(canonicalJson(mixed), canonicalize(mixed));
  });
});

describe('chain/test-vectors.json', () => {
  test('is byte-identical to a fresh generator run, and the generator is deterministic', () => {
    assert.equal(renderVectors(), renderVectors());
    assert.equal(fileContent, renderVectors(), 'chain/test-vectors.json is out of date; run: npm run vectors:chain');
  });

  test('canonical_json and hash are recomputable from input and the key alone', () => {
    const key = Buffer.from(vectors.key_base64, 'base64');
    assert.equal(key.length, 32);
    assert.equal(key.toString('hex'), vectors.key_hex);
    for (const v of allVectors) {
      assert.equal(v.canonical_json, canonicalize(v.input), `${v.name ?? v.input.id}: canonical_json`);
      assert.equal(v.hash, createHmac('sha256', key).update(Buffer.from(v.canonical_json, 'utf8')).digest('hex'));
      assert.equal(v.hash, entryHash(v.input, key));
    }
  });

  test('input + hash is a valid chain entry', () => {
    const ajv = createAjv();
    for (const file of ['common/uuid', 'common/timestamp', 'common/hash', 'common/base64', 'common/lat-e7', 'common/lng-e7', 'common/accuracy-dm',
      'chain/payload-shift_started', 'chain/payload-shift_closed', 'chain/payload-round_opened', 'chain/payload-scan',
      'chain/payload-incident', 'chain/payload-round_closed', 'chain/entry']) {
      ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, 'schemas', `${file}.json`), 'utf8')));
    }
    const validate = ajv.getSchema(`${SCHEMA_ID_BASE}chain/entry.json`);
    for (const v of allVectors) {
      assert.ok(validate({ ...v.input, hash: v.hash }), `${v.name ?? v.input.id}: ${JSON.stringify(validate.errors)}`);
    }
  });

  test('covers every entry type and the required edge cases', () => {
    const types = new Set(vectors.cases.map((v) => v.input.type));
    for (const type of ['shift_started', 'shift_closed', 'round_opened', 'scan', 'incident', 'round_closed']) {
      assert.ok(types.has(type), `no vector for ${type}`);
    }
    const texts = vectors.cases.map((v) => v.canonical_json).join('\n');
    assert.match(texts, /"gnss_time":null/);
    assert.match(texts, /"ref_server_time":null/);
    assert.match(texts, /[áéíóöőúüű]/);
    assert.match(texts, /\p{Extended_Pictographic}/u);
    assert.match(texts, /\u2028/);
    assert.match(texts, /\\u001f/);
    assert.match(texts, /9007199254740991/);
    assert.ok(vectors.cases.some((v) => Object.keys(v.input)[0] > Object.keys(v.input).at(-1)), 'no vector with reversed key order');
  });

  test('the chain links seq 1..3 through prev_hash', () => {
    const entries = vectors.chain.entries;
    assert.equal(entries.length, 3);
    entries.forEach((v, i) => {
      assert.equal(v.input.seq, i + 1);
      assert.equal(v.input.prev_hash, i === 0 ? GENESIS_PREV_HASH : entries[i - 1].hash);
    });
  });

  test('the file is what buildVectors() describes', () => {
    assert.deepEqual(vectors, JSON.parse(JSON.stringify(buildVectors())));
  });
});

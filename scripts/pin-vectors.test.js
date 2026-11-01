import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HASH_BYTES, ITERATIONS, PIN_PATTERN, SALT_BYTES, VECTORS_FILE, pinHash, renderVectors } from './pin-vectors.js';
import { SCHEMA_ID_BASE, createAjv } from './validate.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const fileContent = readFileSync(VECTORS_FILE, 'utf8');
const vectors = JSON.parse(fileContent);
const byName = Object.fromEntries(vectors.cases.map((c) => [c.name, c]));

/** PBKDF2-HMAC-SHA256 with WebCrypto: an implementation independent of the generator's node:crypto call. */
async function webCryptoPbkdf2(password, salt, iterations, bytes) {
  const key = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
  return Buffer.from(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, bytes * 8));
}

describe('pin/test-vectors.json', () => {
  test('is byte-identical to a fresh generator run, and the generator is deterministic', () => {
    assert.equal(renderVectors(), renderVectors());
    assert.equal(fileContent, renderVectors(), 'pin/test-vectors.json is out of date; run: npm run vectors:pin');
  });

  test('the PBKDF2 primitive matches RFC 7914 section 11', async () => {
    const expected = '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783';
    const derived = await webCryptoPbkdf2(Buffer.from('passwd'), Buffer.from('salt'), 1, 64);
    assert.equal(derived.toString('hex'), expected);
  });

  test('every hash is reproduced by WebCrypto from the PIN, the decoded salt and the iterations', async () => {
    for (const c of [...vectors.cases, ...vectors.mismatches]) {
      const derived = await webCryptoPbkdf2(Buffer.from(c.pin, 'ascii'), Buffer.from(c.pin_salt, 'base64'), c.pin_iterations, HASH_BYTES);
      assert.equal(derived.toString('base64') === c.pin_hash, vectors.cases.includes(c), c.name);
    }
  });

  test('the parameters are the specification\'s, and every case changes one of them', () => {
    assert.deepEqual(vectors.defaults, { iterations: 100_000, salt_bytes: 16, hash_bytes: 32 });
    assert.deepEqual([ITERATIONS, SALT_BYTES, HASH_BYTES], [100_000, 16, 32]);
    for (const c of vectors.cases) {
      assert.equal(Buffer.from(c.pin_salt, 'base64').length, SALT_BYTES, c.name);
      assert.equal(Buffer.from(c.pin_hash, 'base64').length, HASH_BYTES, c.name);
    }
    assert.equal(new Set(vectors.cases.map((c) => c.pin_hash)).size, vectors.cases.length, 'every hash differs');
    assert.notEqual(byName['other-salt'].pin_salt, byName.basic.pin_salt);
    assert.equal(byName['more-iterations'].pin_iterations, 2 * ITERATIONS);
    assert.match(byName['salt-with-plus-and-slash'].pin_salt, /\+/);
    assert.match(byName['salt-with-plus-and-slash'].pin_salt, /\//);
  });

  test('every case is a valid PIN verifier of entities/user.json', () => {
    const ajv = createAjv();
    for (const file of ['common/uuid', 'common/timestamp', 'common/base64', 'entities/user']) {
      ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, 'schemas', `${file}.json`), 'utf8')));
    }
    const validate = ajv.getSchema(`${SCHEMA_ID_BASE}entities/user.json`);
    const example = JSON.parse(readFileSync(resolve(ROOT, 'examples/entities/user/valid/guard-with-pin.json'), 'utf8'));
    for (const { pin_hash, pin_salt, pin_iterations, name } of vectors.cases) {
      assert.ok(validate({ ...example, pin_hash, pin_salt, pin_iterations }), `${name}: ${JSON.stringify(validate.errors)}`);
    }
  });

  test('the PIN pattern accepts the PINs and rejects the malformed ones, also a trailing newline', () => {
    assert.equal(vectors.pin_pattern, PIN_PATTERN);
    const pattern = new RegExp(vectors.pin_pattern, 'u');
    for (const c of [...vectors.cases, ...vectors.mismatches]) assert.ok(pattern.test(c.pin), c.name);
    assert.ok(vectors.malformed_pins.includes('123456\n'));
    for (const pin of vectors.malformed_pins) {
      assert.ok(!pattern.test(pin), JSON.stringify(pin));
      assert.throws(() => pinHash(pin, byName.basic.pin_salt, ITERATIONS), /malformed PIN/);
    }
  });

  test('common/pin.json uses the same pattern, so the API accepts exactly the hashable PINs', () => {
    const schema = JSON.parse(readFileSync(resolve(ROOT, 'schemas/common/pin.json'), 'utf8'));
    assert.equal(schema.type, 'string');
    assert.equal(schema.pattern, vectors.pin_pattern);
  });
});

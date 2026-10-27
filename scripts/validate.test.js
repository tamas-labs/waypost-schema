import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SCHEMA_DIALECT, SCHEMA_ID_BASE, validateRepo } from './validate.js';

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

/** Creates a throwaway repo from a { 'relative/path': content } map; objects are written as JSON. */
function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'waypost-schema-validate-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

const schema = (path, body) => ({ $schema: SCHEMA_DIALECT, $id: `${SCHEMA_ID_BASE}${path}`, ...body });

const uuidSchema = schema('common/uuid.json', {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
});
const siteSchema = schema('entities/site.json', {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { $ref: '../common/uuid.json' }, name: { type: 'string', minLength: 1 } },
  additionalProperties: false,
});
const goodSite = { id: '019a2b3c-4d5e-7f00-8a00-0123456789ab', name: 'Telephely A' };

/** A complete, correct repo; individual tests override or add files. */
function goodFiles() {
  return {
    'schemas/common/uuid.json': uuidSchema,
    'schemas/entities/site.json': siteSchema,
    'examples/common/uuid/valid/lowercase.json': JSON.stringify(goodSite.id),
    'examples/common/uuid/invalid/uuid-v4.json': JSON.stringify('019a2b3c-4d5e-4f00-8a00-0123456789ab'),
    'examples/entities/site/valid/minimal.json': goodSite,
    'examples/entities/site/invalid/missing-name.json': { id: goodSite.id },
    'examples/entities/site/invalid/bad-id-via-ref.json': { ...goodSite, id: 'not-a-uuid' },
  };
}

function run(files, options) {
  return validateRepo(makeRepo(files), options);
}

function assertFails(result, pattern) {
  assert.ok(
    result.errors.some((e) => pattern.test(e)),
    `expected an error matching ${pattern}, got:\n${result.errors.join('\n') || '(no errors)'}`,
  );
}

describe('validateRepo', () => {
  test('passes on a correct repo, resolving cross-file $refs', () => {
    const result = run(goodFiles());
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.stats, { schemas: 2, valid: 2, invalid: 3 });
  });

  test('passes on an empty repo', () => {
    const result = run({});
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.schemas, 0);
  });

  test('verbose mode reports why each invalid example was rejected', () => {
    const result = run(goodFiles(), { verbose: true });
    assert.ok(result.info.some((line) => /missing-name\.json.*must have required property 'name'/.test(line)));
  });

  test('fails when a valid example does not validate', () => {
    const result = run({ ...goodFiles(), 'examples/entities/site/valid/extra-field.json': { ...goodSite, x: 1 } });
    assertFails(result, /site\/valid\/extra-field\.json: expected valid, but: .*additional properties/);
  });

  test('fails when an invalid example validates', () => {
    const result = run({ ...goodFiles(), 'examples/entities/site/invalid/actually-fine.json': goodSite });
    assertFails(result, /site\/invalid\/actually-fine\.json: expected invalid, but it validates/);
  });

  test('fails when a schema has an unresolvable $ref', () => {
    const files = goodFiles();
    files['schemas/entities/site.json'] = { ...siteSchema, properties: { id: { $ref: '../common/missing.json' } } };
    assertFails(run(files), /schemas\/entities\/site\.json: does not compile/);
  });

  test('fails on an unknown keyword (strict mode)', () => {
    const files = goodFiles();
    files['schemas/common/uuid.json'] = { ...uuidSchema, patern: '^x$' };
    assertFails(run(files), /schemas\/common\/uuid\.json: .*unknown keyword: "patern"/);
  });

  test('fails when a schema does not conform to the meta-schema', () => {
    const files = goodFiles();
    files['schemas/common/uuid.json'] = { ...uuidSchema, type: 'text' };
    assertFails(run(files), /schemas\/common\/uuid\.json: schema is invalid/);
  });

  test('fails on a wrong $schema dialect', () => {
    const files = goodFiles();
    files['schemas/common/uuid.json'] = { ...uuidSchema, $schema: 'http://json-schema.org/draft-07/schema#' };
    assertFails(run(files), /schemas\/common\/uuid\.json: "\$schema" must be/);
  });

  test('fails when $id does not match the file path', () => {
    const files = goodFiles();
    files['schemas/common/uuid.json'] = { ...uuidSchema, $id: `${SCHEMA_ID_BASE}uuid.json` };
    assertFails(run(files), /schemas\/common\/uuid\.json: "\$id" must be "https:\/\/waypost\.dev\/schema\/common\/uuid\.json"/);
  });

  test('fails on malformed JSON in a schema or an example', () => {
    const result = run({
      ...goodFiles(),
      'schemas/entities/broken.json': '{ "type": ',
      'examples/entities/site/invalid/broken.json': '{ "id": ',
    });
    assertFails(result, /schemas\/entities\/broken\.json: invalid JSON/);
    assertFails(result, /site\/invalid\/broken\.json: invalid JSON/);
  });

  test('fails when a schema lacks a valid or an invalid example', () => {
    const files = goodFiles();
    delete files['examples/common/uuid/invalid/uuid-v4.json'];
    delete files['examples/entities/site/valid/minimal.json'];
    const result = run(files);
    assertFails(result, /schemas\/common\/uuid\.json: no invalid example/);
    assertFails(result, /schemas\/entities\/site\.json: no valid example/);
  });

  test('fails on an example without a matching schema', () => {
    const result = run({ ...goodFiles(), 'examples/entities/route/valid/a.json': {} });
    assertFails(result, /examples\/entities\/route\/valid\/a\.json: no schema at schemas\/entities\/route\.json/);
  });

  test('fails on misplaced files', () => {
    const result = run({
      ...goodFiles(),
      'examples/entities/site/minimal.json': goodSite,
      'examples/entities/site/valid/nested/minimal.json': goodSite,
      'examples/entities/site/valid/notes.txt': 'x',
      'schemas/entities/README.md': '# x',
    });
    assertFails(result, /examples\/entities\/site\/minimal\.json: must be/);
    assertFails(result, /examples\/entities\/site\/valid\/nested\/minimal\.json: must be/);
    assertFails(result, /examples\/entities\/site\/valid\/notes\.txt: must be/);
    assertFails(result, /schemas\/entities\/README\.md: unexpected non-JSON file/);
  });
});

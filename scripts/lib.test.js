import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderEmbedded } from './embed.js';
import { schemaPaths } from './types.js';
import { ROOT, tempModule, typecheck } from './typecheck.js';
import { createAjv } from './validate.js';
import { SCHEMA_ID_BASE, schemaId, schemas } from '../lib/index.js';
import { chainVectors, scheduleVectors } from '../lib/vectors.js';

const readJson = (path) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));

describe('lib/ (the JS exports)', () => {
  test('lib/generated/ is identical to a fresh embed run', () => {
    for (const [name, content] of Object.entries(renderEmbedded())) {
      assert.equal(readFileSync(resolve(ROOT, 'lib', 'generated', name), 'utf8'), content, `lib/generated/${name} is out of date; run: npm run embed`);
    }
  });

  test('schemas holds every schema file, keyed by path', () => {
    assert.deepEqual(Object.keys(schemas).sort(), schemaPaths().sort());
    for (const path of schemaPaths()) assert.deepEqual(schemas[path], readJson(`schemas/${path}.json`), path);
    assert.equal(schemaId('chain/entry'), `${SCHEMA_ID_BASE}chain/entry.json`);
    assert.equal(schemas['chain/entry'].$id, schemaId('chain/entry'));
    assert.throws(() => schemaId('chain/nope'), /Unknown schema: chain\/nope/);
    assert.throws(() => schemaId('toString'), /Unknown schema/);
  });

  test('the vectors are the JSON files', () => {
    assert.deepEqual(chainVectors, readJson('chain/test-vectors.json'));
    assert.deepEqual(scheduleVectors, readJson('schedule/test-vectors.json'));
  });

  test('Ajv validates every example through the exported schemas and schemaId', () => {
    const ajv = createAjv();
    for (const schema of Object.values(schemas)) ajv.addSchema(schema);
    for (const path of schemaPaths()) {
      const validate = ajv.getSchema(schemaId(path));
      for (const kind of ['valid', 'invalid']) {
        const dir = resolve(ROOT, 'examples', path, kind);
        for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
          assert.equal(validate(JSON.parse(readFileSync(join(dir, file), 'utf8'))), kind === 'valid', `${path}/${kind}/${file}`);
        }
      }
    }
  });

  test('the vector files match the types in lib/vectors.d.ts', () => {
    const source = (importPath) => `import type { ChainVectors, ScheduleVectors } from ${importPath('lib/vectors.d.ts')};

export const chain: ChainVectors = ${readFileSync(resolve(ROOT, 'chain/test-vectors.json'), 'utf8')};

export const schedule: ScheduleVectors = ${readFileSync(resolve(ROOT, 'schedule/test-vectors.json'), 'utf8')};
`;
    const { status, output } = typecheck([tempModule('vectors.mts', source)]);
    assert.equal(status, 0, output);
  });
});

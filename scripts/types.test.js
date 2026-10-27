import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderTypes, schemaPaths, typeNameOf, TYPES_FILE } from './types.js';
import { ROOT, tempModule, typecheck } from './typecheck.js';

/** A temporary module that imports SchemaTypes. */
const withSchemaTypes = (name, body) =>
  tempModule(name, (importPath) => `import type { SchemaTypes } from ${importPath('types/index.d.ts')};\n\n${body}\n`);

describe('types/index.d.ts', () => {
  test('is identical to a fresh generator run', async () => {
    assert.equal(readFileSync(TYPES_FILE, 'utf8'), await renderTypes(), 'types/index.d.ts is out of date; run: npm run types');
  });

  test('type names follow the schema paths', () => {
    assert.deepEqual(
      ['common/uuid', 'common/lat-e7', 'entities/route-version-checkpoint', 'chain/entry', 'chain/payload-round_closed', 'api/error', 'api/sync-push.request']
        .map(typeNameOf),
      ['Uuid', 'LatE7', 'RouteVersionCheckpoint', 'ChainEntry', 'RoundClosedPayload', 'ErrorResponse', 'SyncPushRequest'],
    );
    assert.equal(new Set(schemaPaths().map(typeNameOf)).size, schemaPaths().length);
  });

  test('compiles with tsc --strict together with the sample and every valid example', () => {
    const examples = [];
    for (const path of schemaPaths()) {
      const dir = resolve(ROOT, 'examples', path, 'valid');
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
        const json = readFileSync(join(dir, file), 'utf8').trim();
        examples.push(`// examples/${path}/valid/${file}\nexport const e${examples.length}: SchemaTypes[${JSON.stringify(path)}] = ${json};`);
      }
    }
    assert.ok(examples.length >= schemaPaths().length);
    const { status, output } = typecheck([() => resolve(ROOT, 'scripts', 'types-sample.ts'), withSchemaTypes('examples.mts', examples.join('\n\n'))]);
    assert.equal(status, 0, output);
  });

  test('tsc rejects a chain entry whose payload does not match its type', () => {
    const body = `type Entry = SchemaTypes['chain/entry'];
declare const fields: Omit<Extract<Entry, { type: 'scan' }>, 'type' | 'payload'>;
declare const roundClosed: SchemaTypes['chain/payload-round_closed'];
export const entry: Entry = { ...fields, type: 'scan', payload: roundClosed };`;
    const { status, output } = typecheck([withSchemaTypes('bad.mts', body)]);
    assert.notEqual(status, 0);
    assert.match(output, /bad\.mts\([0-9]+,[0-9]+\): error TS2322/);
    assert.match(output, /Types of property 'payload' are incompatible/);
  });
});

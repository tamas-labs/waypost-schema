import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPES_FILE, renderTypes, schemaPaths, typeNameOf } from './types.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const TSC = resolve(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/** Runs tsc with the repo's tsconfig.json on the given files only; returns { status, output }. */
function typecheck(files) {
  const dir = mkdtempSync(join(tmpdir(), 'waypost-types-'));
  try {
    const config = { extends: resolve(ROOT, 'tsconfig.json'), files: files.map((f) => f(dir)), include: [] };
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
    const result = spawnSync(process.execPath, [TSC, '-p', join(dir, 'tsconfig.json'), '--pretty', 'false'], { encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A file in the temporary directory that imports the generated types. */
function tempModule(name, body) {
  return (dir) => {
    const path = join(dir, name);
    const types = relative(dir, TYPES_FILE).split('\\').join('/').replace(/\.d\.ts$/, '.js');
    writeFileSync(path, `import type { SchemaTypes } from ${JSON.stringify(types)};\n\n${body}\n`);
    return path;
  };
}

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
    const { status, output } = typecheck([() => resolve(ROOT, 'scripts', 'types-sample.ts'), tempModule('examples.mts', examples.join('\n\n'))]);
    assert.equal(status, 0, output);
  });

  test('tsc rejects a chain entry whose payload does not match its type', () => {
    const body = `type Entry = SchemaTypes['chain/entry'];
declare const fields: Omit<Extract<Entry, { type: 'scan' }>, 'type' | 'payload'>;
declare const roundClosed: SchemaTypes['chain/payload-round_closed'];
export const entry: Entry = { ...fields, type: 'scan', payload: roundClosed };`;
    const { status, output } = typecheck([tempModule('bad.mts', body)]);
    assert.notEqual(status, 0);
    assert.match(output, /bad\.mts\([0-9]+,[0-9]+\): error TS2322/);
    assert.match(output, /Types of property 'payload' are incompatible/);
  });
});

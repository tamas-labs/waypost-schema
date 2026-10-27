// Installs the package into an empty npm project, as the app does (file:../waypost-schema), and uses it
// there from Node and from TypeScript (nodenext and bundler module resolution).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, tsc } from './typecheck.js';

const NODE_CHECK = `import assert from 'node:assert/strict';
import { SCHEMA_ID_BASE, schemaId, schemas } from '@waypost/schema';
import { chainVectors, scheduleVectors } from '@waypost/schema/vectors';
import entry from '@waypost/schema/schemas/chain/entry.json' with { type: 'json' };
import chainJson from '@waypost/schema/chain/test-vectors.json' with { type: 'json' };
import scheduleJson from '@waypost/schema/schedule/test-vectors.json' with { type: 'json' };
import pkg from '@waypost/schema/package.json' with { type: 'json' };

assert.equal(SCHEMA_ID_BASE, 'https://waypost.dev/schema/');
assert.ok(Object.keys(schemas).length >= 35);
assert.deepEqual(schemas['chain/entry'], entry);
assert.equal(schemaId('api/sync-push.request'), 'https://waypost.dev/schema/api/sync-push.request.json');
assert.deepEqual(chainVectors, chainJson);
assert.deepEqual(scheduleVectors, scheduleJson);
await assert.rejects(import('@waypost/schema/scripts/types.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
console.log(\`ok \${pkg.version}\`);
`;

const TS_CHECK = `import { schemaId, schemas, type ChainEntry, type SchemaPath, type SchemaTypes, type SyncPullResponse } from '@waypost/schema';
import { chainVectors, scheduleVectors, type ChainVector } from '@waypost/schema/vectors';

export const id: 'https://waypost.dev/schema/chain/entry.json' = schemaId('chain/entry');
const path: SchemaPath = 'api/sync-pull.response';
export const schemaIdOfPath: string = schemas[path].$id;
export const firstVector: ChainVector | undefined = chainVectors.cases[0];
export const firstSchedule: SchemaTypes['entities/schedule'] | undefined = scheduleVectors.expansion[0]?.schedule;

export function method(entry: ChainEntry): string | null {
  return entry.type === 'scan' ? entry.payload.method : null;
}

export function siteCount(pull: SyncPullResponse): number {
  return pull.changes.sites.length;
}

// @ts-expect-error unknown schema path
schemaId('api/nope');
`;

const COMPILER_OPTIONS = { strict: true, noEmit: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, target: 'es2022', types: [] };

describe('npm install file:<repo> into an empty project', () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'waypost-npm-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'waypost-schema-smoke', private: true, type: 'module' }));
    const result = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--offline', `file:${ROOT}`], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test('installs as a link to the repository', () => {
    assert.ok(lstatSync(join(dir, 'node_modules', '@waypost', 'schema')).isSymbolicLink());
  });

  test('Node imports the schemas, the vectors and the JSON files; internals are not exported', () => {
    writeFileSync(join(dir, 'check.mjs'), NODE_CHECK);
    const result = spawnSync(process.execPath, ['check.mjs'], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /^ok \d+\.\d+\.\d+/);
  });

  for (const [name, options] of [
    ['nodenext', { module: 'nodenext', moduleResolution: 'nodenext' }],
    ['bundler (Expo)', { module: 'preserve', moduleResolution: 'bundler' }],
  ]) {
    test(`TypeScript finds the types with ${name} module resolution`, () => {
      writeFileSync(join(dir, 'check.ts'), TS_CHECK);
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { ...COMPILER_OPTIONS, ...options }, files: ['check.ts'] }));
      const { status, output } = tsc(dir);
      assert.equal(status, 0, output);
    });
  }
});

// Test helper: runs the repo's TypeScript compiler on files written to a temporary directory.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const TSC = resolve(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/** Runs tsc -p dir/tsconfig.json; returns { status, output }. */
export function tsc(dir) {
  const result = spawnSync(process.execPath, [TSC, '-p', join(dir, 'tsconfig.json'), '--pretty', 'false'], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Type-checks with the repo's tsconfig.json. files: functions dir → absolute path, e.g. tempModule(...) or
 * () => an existing file. Returns { status, output }.
 */
export function typecheck(files) {
  const dir = mkdtempSync(join(tmpdir(), 'waypost-tsc-'));
  try {
    const config = { extends: resolve(ROOT, 'tsconfig.json'), files: files.map((f) => f(dir)), include: [] };
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
    return tsc(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * A module in the temporary directory. source: function from importPath (repo-relative path of a .d.ts or
 * .js file → module specifier usable from the temporary directory) to the source text.
 */
export function tempModule(name, source) {
  return (dir) => {
    const path = join(dir, name);
    const importPath = (repoPath) => JSON.stringify(relative(dir, resolve(ROOT, repoPath)).split('\\').join('/').replace(/\.d\.ts$/, '.js'));
    writeFileSync(path, source(importPath));
    return path;
  };
}

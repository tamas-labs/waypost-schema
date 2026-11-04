#!/usr/bin/env node
// Checks that a git tag may be released: the tag is v<package.json version>, CHANGELOG.md has a section for the
// version, and the version in src/Paths.php (Paths::VERSION) and lib/generated/version.js (SCHEMA_VERSION) is the
// same. CI runs it on every pushed tag. Usage:
//   node scripts/release.js v0.5.0

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

/** The version as package.json, src/Paths.php and lib/generated/version.js state it (null if not found). */
export function versionsIn(root) {
  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  return {
    'package.json': JSON.parse(read('package.json')).version,
    'src/Paths.php': read('src/Paths.php').match(/public const string VERSION = '([^']*)';/)?.[1] ?? null,
    'lib/generated/version.js': read('lib/generated/version.js').match(/^export default "([^"]*)";$/m)?.[1] ?? null,
  };
}

/** What prevents releasing root under tag; empty if nothing. */
export function releaseProblems(root, tag) {
  const versions = versionsIn(root);
  const version = versions['package.json'];
  const problems = [];
  for (const [file, found] of Object.entries(versions)) {
    if (found !== version) problems.push(`${file} states version ${JSON.stringify(found)}, package.json ${JSON.stringify(version)}`);
  }
  if (tag !== `v${version}`) problems.push(`tag ${JSON.stringify(tag)} is not v${version} (package.json)`);
  const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
  if (!changelog.split('\n').some((line) => line.startsWith(`## [${version}] – `))) {
    problems.push(`CHANGELOG.md has no "## [${version}] – <date>" section`);
  }
  return problems;
}

function main(argv) {
  const tag = argv[0];
  if (!tag) {
    console.error('usage: node scripts/release.js <tag>');
    return 2;
  }
  const problems = releaseProblems(ROOT, tag);
  for (const problem of problems) console.error(`FAIL ${problem}`);
  if (problems.length > 0) return 1;
  console.log(`ok: ${tag} may be released`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

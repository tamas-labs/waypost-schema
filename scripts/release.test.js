import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { releaseProblems, versionsIn } from './release.js';
import { ROOT } from './typecheck.js';
import { SCHEMA_VERSION } from '../lib/index.js';

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

/** A copy of the files release.js reads, changed by edit(root). */
function withCopy(edit, check) {
  const dir = mkdtempSync(join(tmpdir(), 'waypost-release-'));
  try {
    for (const path of ['package.json', 'CHANGELOG.md', 'src/Paths.php', 'lib/generated/version.js']) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      copyFileSync(join(ROOT, path), join(dir, path));
    }
    edit(dir);
    check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const replaceIn = (dir, path, from, to) => writeFileSync(join(dir, path), readFileSync(join(dir, path), 'utf8').replace(from, to));

describe('release (scripts/release.js)', () => {
  test('package.json, Paths::VERSION and SCHEMA_VERSION state the same version', () => {
    assert.match(version, /^[0-9]+\.[0-9]+\.[0-9]+$/);
    assert.deepEqual(versionsIn(ROOT), { 'package.json': version, 'src/Paths.php': version, 'lib/generated/version.js': version });
    assert.equal(SCHEMA_VERSION, version);
  });

  test('the current version may be released under its own tag only', () => {
    assert.deepEqual(releaseProblems(ROOT, `v${version}`), []);
    assert.deepEqual(releaseProblems(ROOT, version), [`tag "${version}" is not v${version} (package.json)`]);
    assert.equal(releaseProblems(ROOT, 'v0.0.0-other').length, 1);
  });

  test('a version without a CHANGELOG section or with a stale Paths::VERSION is refused', () => {
    withCopy(
      (dir) => replaceIn(dir, 'package.json', `"version": "${version}"`, '"version": "99.0.0"'),
      (dir) =>
        assert.deepEqual(releaseProblems(dir, 'v99.0.0'), [
          `src/Paths.php states version "${version}", package.json "99.0.0"`,
          `lib/generated/version.js states version "${version}", package.json "99.0.0"`,
          'CHANGELOG.md has no "## [99.0.0] – <date>" section',
        ]),
    );
    withCopy(
      (dir) => replaceIn(dir, 'src/Paths.php', `VERSION = '${version}'`, 'VERSION = $version'),
      (dir) => assert.deepEqual(releaseProblems(dir, `v${version}`), [`src/Paths.php states version null, package.json "${version}"`]),
    );
  });
});

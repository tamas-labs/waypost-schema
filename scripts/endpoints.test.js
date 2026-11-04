import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEndpoints } from './endpoints.js';
import { schemaPaths } from './types.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'endpoints.json'), 'utf8'));
const names = schemaPaths();

/** A copy of the manifest changed by change(copy). */
function changed(change) {
  const copy = structuredClone(manifest);
  change(copy);
  return copy;
}
const endpoint = (m, name) => m.endpoints.find((e) => e.name === name);

describe('endpoints.json', () => {
  test('passes the checks', () => {
    assert.deepEqual(checkEndpoints(manifest, names), []);
  });

  test('lists every endpoint once, and uses every api/ schema', () => {
    assert.equal(new Set(manifest.endpoints.map((e) => e.name)).size, manifest.endpoints.length);
    const used = JSON.stringify(manifest);
    for (const name of names.filter((n) => n.startsWith('api/'))) assert.ok(used.includes(`"${name}"`), name);
  });

  test('rejects a missing schema, a schema of the wrong kind and an unused api/ schema', () => {
    assert.match(checkEndpoints(changed((m) => { endpoint(m, 'sites.store').request.schema = 'api/site-make.request'; }), names).join('\n'),
      /sites\.store request: no schema api\/site-make\.request/);
    assert.match(checkEndpoints(changed((m) => { endpoint(m, 'sites.index').query = 'api/site-list.response'; }), names).join('\n'),
      /sites\.index query: api\/site-list\.response is not an api\/\*\.query schema/);
    assert.match(checkEndpoints(changed((m) => { m.endpoints = m.endpoints.filter((e) => e.name !== 'users.pin'); }), names).join('\n'),
      /schemas\/api\/user-pin\.request\.json is not used by any endpoint/);
  });

  test('rejects path parameters that differ from the path', () => {
    const errors = checkEndpoints(changed((m) => { endpoint(m, 'sites.users.destroy').path_parameters = { site: 'common/uuid' }; }), names);
    assert.match(errors.join('\n'), /sites\.users\.destroy: path_parameters \(site\) differ from the path \(site, user\)/);
  });

  test('rejects a duplicate route, a GET with a body and a binary body with a schema', () => {
    assert.match(checkEndpoints(changed((m) => { m.endpoints.push({ ...endpoint(m, 'sites.show'), name: 'sites.show-again', path: '/sites/{id}', path_parameters: { id: 'common/uuid' } }); }), names).join('\n'),
      /sites\.show-again: GET \/sites\/\{id\} is listed twice/);
    assert.match(checkEndpoints(changed((m) => { endpoint(m, 'sites.show').idempotency_key = true; }), names).join('\n'),
      /sites\.show: a GET has neither a request body nor an Idempotency-Key/);
    assert.match(checkEndpoints(changed((m) => { endpoint(m, 'reports.file').responses['200'].schema = 'api/report-list.response'; }), names).join('\n'),
      /reports\.file response 200: application\/pdf has no schema/);
  });

  test('rejects an undeclared auth kind and a malformed table', () => {
    assert.match(checkEndpoints(changed((m) => { delete m.auth.revoked; }), names).join('\n'), /sync\.push-final: auth revoked is not declared/);
    assert.match(checkEndpoints(changed((m) => { endpoint(m, 'sites.index').method = 'get'; }), names).join('\n'), /endpoints\.json: \/endpoints\/[0-9]+\/method must be equal to one of the allowed values/);
  });
});

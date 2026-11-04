// Checks endpoints.json, the endpoint table of the API (docs/decisions.md, SCH-006): its shape
// (scripts/endpoints.schema.json), and what a schema cannot express – every schema it names exists and has the
// right kind (.query / .request / .response), every api/ schema is used by an endpoint, names and method + path are
// unique, the path parameters are the ones in the path, and the auth kinds and headers are declared.
// Run by scripts/validate.js.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const SHAPE = JSON.parse(readFileSync(resolve(fileURLToPath(import.meta.url), '..', 'endpoints.schema.json'), 'utf8'));
const BINARY = new Set(['image/jpeg', 'application/pdf']);

let validateShape;

/** Problems of an endpoint table, given the names of every schema (paths under schemas/ without .json). */
export function checkEndpoints(manifest, schemaNames) {
  validateShape ??= new Ajv2020({ allErrors: true, strict: true }).compile(SHAPE);
  if (!validateShape(manifest)) {
    return validateShape.errors.map((e) => `endpoints.json: ${e.instancePath || '/'} ${e.message}`);
  }
  const errors = [];
  const known = new Set(schemaNames);
  const used = new Set();
  const use = (where, name, suffix) => {
    if (!known.has(name)) errors.push(`endpoints.json: ${where}: no schema ${name}`);
    else if (suffix && !(name.startsWith('api/') && name.endsWith(suffix))) errors.push(`endpoints.json: ${where}: ${name} is not an api/*${suffix} schema`);
    used.add(name);
  };

  use('error_response', manifest.error_response);
  for (const [header, { schema }] of Object.entries(manifest.headers)) use(`headers.${header}`, schema);

  const names = new Set();
  const routes = new Set();
  const authUsed = new Set();
  for (const endpoint of manifest.endpoints) {
    const where = endpoint.name;
    if (names.has(where)) errors.push(`endpoints.json: ${where}: the name is not unique`);
    names.add(where);
    const route = `${endpoint.method} ${endpoint.path.replace(/\{[a-z_]+\}/g, '{}')}`;
    if (routes.has(route)) errors.push(`endpoints.json: ${where}: ${endpoint.method} ${endpoint.path} is listed twice`);
    routes.add(route);

    const inPath = [...endpoint.path.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
    const declared = Object.keys(endpoint.path_parameters);
    if (inPath.join() !== declared.join()) {
      errors.push(`endpoints.json: ${where}: path_parameters (${declared.join(', ') || '–'}) differ from the path (${inPath.join(', ') || '–'})`);
    }
    for (const [param, schema] of Object.entries(endpoint.path_parameters)) use(`${where} path parameter ${param}`, schema);

    for (const kind of endpoint.auth) {
      authUsed.add(kind);
      if (!(kind in manifest.auth)) errors.push(`endpoints.json: ${where}: auth ${kind} is not declared under auth`);
    }
    if (endpoint.auth.includes('acting') && !('X-Acting-User' in manifest.headers)) errors.push(`endpoints.json: ${where}: acting needs the X-Acting-User header`);
    if (endpoint.idempotency_key && !('Idempotency-Key' in manifest.headers)) errors.push(`endpoints.json: ${where}: the Idempotency-Key header is not declared`);
    if (endpoint.method === 'GET' && (endpoint.idempotency_key || endpoint.request !== null)) {
      errors.push(`endpoints.json: ${where}: a GET has neither a request body nor an Idempotency-Key`);
    }

    if (endpoint.query !== null) use(`${where} query`, endpoint.query, '.query');
    const bodies = [['request', endpoint.request, '.request'], ...Object.entries(endpoint.responses).map(([status, body]) => [`response ${status}`, body, '.response'])];
    for (const [what, body, suffix] of bodies) {
      if (body === null) continue;
      if (BINARY.has(body.content_type) !== (body.schema === null)) {
        errors.push(`endpoints.json: ${where} ${what}: ${body.content_type} ${BINARY.has(body.content_type) ? 'has no' : 'needs a'} schema`);
      }
      if (body.schema !== null) use(`${where} ${what}`, body.schema, suffix);
    }
  }

  for (const kind of Object.keys(manifest.auth)) {
    if (!authUsed.has(kind)) errors.push(`endpoints.json: auth ${kind} is declared but no endpoint uses it`);
  }
  for (const name of schemaNames) {
    if (name.startsWith('api/') && !used.has(name)) errors.push(`endpoints.json: schemas/${name}.json is not used by any endpoint`);
  }
  return errors;
}

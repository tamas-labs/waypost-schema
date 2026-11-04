#!/usr/bin/env node
// Validates the schema repository:
//   1. every schemas/**/*.json is a draft 2020-12 schema whose $id matches its path and which compiles
//      (all schemas are registered first, so cross-file $refs resolve);
//   2. every examples/<schema path>/valid/*.json validates against schemas/<schema path>.json;
//   3. every examples/<schema path>/invalid/*.json fails against it, with the error its entry in
//      examples/<schema path>/expected-errors.json names (so that it fails for the reason in its name);
//   4. every schema has at least one valid and one invalid example;
//   5. endpoints.json (required once there is an api/ schema) passes scripts/endpoints.js.
// Exits with 1 if anything fails. Usage: node scripts/validate.js [--verbose] [--root <dir>]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { checkEndpoints } from './endpoints.js';

export const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';
export const SCHEMA_ID_BASE = 'https://waypost.dev/schema/v1/';

const EXAMPLE_KINDS = ['valid', 'invalid'];
const EXPECTED_ERRORS = 'expected-errors.json';

/** Recursively lists files under dir (sorted, relative POSIX paths). Missing dir → []. */
function listFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const sub of listFiles(full)) files.push(`${entry.name}/${sub}`);
    } else {
      files.push(entry.name);
    }
  }
  return files.sort();
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function createAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: true,
    strictTuples: true,
    strictRequired: false,
  });
  addFormats(ajv);
  return ajv;
}

function formatErrors(errors) {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
}

/** The property an error is about (required, additionalProperties, dependentRequired), if any. */
const errorProperty = (e) => e.params?.missingProperty ?? e.params?.additionalProperty;

/** An Ajv error as an expected-errors.json entry: { path, keyword[, property] }. */
function expectationOf(e) {
  const property = errorProperty(e);
  return JSON.stringify({ path: e.instancePath, keyword: e.keyword, ...(property === undefined ? {} : { property }) });
}

/**
 * Problems of one example's expected errors against its actual errors: every expectation ({ path, keyword[, property] },
 * path = the JSON Pointer of the instance) must match one of them.
 */
function expectationProblems(expected, errors) {
  const list = Array.isArray(expected) ? expected : [expected];
  const wellFormed = (x) => x !== null && typeof x === 'object' && typeof x.path === 'string' && typeof x.keyword === 'string'
    && (x.property === undefined || typeof x.property === 'string') && Object.keys(x).every((k) => ['path', 'keyword', 'property'].includes(k));
  if (list.length === 0 || !list.every(wellFormed)) return ['the entry must be { path, keyword[, property] } or a non-empty list of them'];
  return list
    .filter((x) => !errors.some((e) => e.instancePath === x.path && e.keyword === x.keyword && (x.property === undefined || errorProperty(e) === x.property)))
    .map((x) => `fails, but not with ${JSON.stringify(x)}`);
}

/**
 * Validates the schemas and examples under root.
 * @returns {{ errors: string[], info: string[], stats: { schemas: number, valid: number, invalid: number } }}
 */
export function validateRepo(root, { verbose = false } = {}) {
  const schemasDir = join(root, 'schemas');
  const examplesDir = join(root, 'examples');
  const errors = [];
  const info = [];
  const stats = { schemas: 0, valid: 0, invalid: 0 };
  const ajv = createAjv();

  // 1. Load and register every schema, so cross-file $refs resolve regardless of order.
  const schemas = new Map(); // schema path without .json → $id
  for (const file of listFiles(schemasDir)) {
    const rel = `schemas/${file}`;
    if (!file.endsWith('.json')) {
      errors.push(`${rel}: unexpected non-JSON file in schemas/`);
      continue;
    }
    let schema;
    try {
      schema = readJson(join(schemasDir, file));
    } catch (err) {
      errors.push(`${rel}: invalid JSON: ${err.message}`);
      continue;
    }
    const name = file.slice(0, -'.json'.length);
    const expectedId = `${SCHEMA_ID_BASE}${file}`;
    if (schema.$schema !== SCHEMA_DIALECT) {
      errors.push(`${rel}: "$schema" must be "${SCHEMA_DIALECT}"`);
    }
    if (schema.$id !== expectedId) {
      errors.push(`${rel}: "$id" must be "${expectedId}" (got ${JSON.stringify(schema.$id)})`);
      continue;
    }
    try {
      ajv.addSchema(schema);
      schemas.set(name, expectedId);
    } catch (err) {
      errors.push(`${rel}: ${err.message}`);
    }
  }

  // 2. Compile every schema.
  const validators = new Map();
  for (const [name, id] of schemas) {
    try {
      validators.set(name, ajv.getSchema(id));
      stats.schemas++;
    } catch (err) {
      errors.push(`schemas/${name}.json: does not compile: ${err.message}`);
    }
  }

  // 3. Validate the examples.
  const exampleCounts = new Map([...validators.keys()].map((name) => [name, { valid: 0, invalid: 0 }]));
  const expectedFiles = new Map(); // schema path → expected-errors.json content
  const rejections = new Map(); // schema path → Map(example name → Ajv errors)
  for (const file of listFiles(examplesDir)) {
    const rel = `examples/${file}`;
    const parts = file.split('/');
    if (parts.at(-1) === EXPECTED_ERRORS) {
      const name = parts.slice(0, -1).join('/');
      try {
        const content = readJson(join(examplesDir, file));
        if (content === null || typeof content !== 'object' || Array.isArray(content)) throw new Error('must be an object');
        expectedFiles.set(name, content);
      } catch (err) {
        errors.push(`${rel}: invalid JSON: ${err.message}`);
        expectedFiles.set(name, {});
      }
      continue;
    }
    const kindIndex = parts.findIndex((p) => EXAMPLE_KINDS.includes(p));
    if (kindIndex < 1 || kindIndex !== parts.length - 2 || !file.endsWith('.json')) {
      errors.push(`${rel}: must be examples/<schema path>/(valid|invalid)/<name>.json`);
      continue;
    }
    const name = parts.slice(0, kindIndex).join('/');
    const kind = parts[kindIndex];
    if (!schemas.has(name)) {
      errors.push(`${rel}: no schema at schemas/${name}.json`);
      continue;
    }
    const validate = validators.get(name);
    if (!validate) continue; // compile error already reported

    let instance;
    try {
      instance = readJson(join(examplesDir, file));
    } catch (err) {
      errors.push(`${rel}: invalid JSON: ${err.message}`);
      continue;
    }

    const ok = validate(instance);
    exampleCounts.get(name)[kind]++;
    stats[kind]++;
    if (kind === 'valid' && !ok) {
      errors.push(`${rel}: expected valid, but: ${formatErrors(validate.errors)}`);
    } else if (kind === 'invalid' && ok) {
      errors.push(`${rel}: expected invalid, but it validates`);
    } else if (kind === 'invalid' && !ok) {
      if (!rejections.has(name)) rejections.set(name, new Map());
      rejections.get(name).set(parts.at(-1).replace(/\.json$/, ''), [...validate.errors]);
    }
    if (verbose && (kind === 'valid') === ok) {
      info.push(kind === 'valid' ? `ok   ${rel}` : `ok   ${rel} (rejected: ${formatErrors(validate.errors)})`);
    }
  }

  // The reason of each rejection.
  for (const name of new Set([...rejections.keys(), ...expectedFiles.keys()])) {
    const file = `examples/${name}/${EXPECTED_ERRORS}`;
    const expected = expectedFiles.get(name);
    const rejected = rejections.get(name) ?? new Map();
    if (expected === undefined) {
      errors.push(`${file}: missing; it names the expected error of each invalid example, e.g. ${expectationOf([...rejected.values()][0][0])}`);
      continue;
    }
    for (const [example, exampleErrors] of rejected) {
      const rel = `examples/${name}/invalid/${example}.json`;
      if (!(example in expected)) {
        errors.push(`${rel}: no entry in ${file}; its errors: ${exampleErrors.map(expectationOf).join(', ')}`);
        continue;
      }
      for (const problem of expectationProblems(expected[example], exampleErrors)) {
        errors.push(`${rel}: ${problem} (${file}); its errors: ${exampleErrors.map(expectationOf).join(', ')}`);
      }
    }
    for (const example of Object.keys(expected)) {
      if (!rejected.has(example)) errors.push(`${file}: ${example} is not an invalid example of ${name} that fails`);
    }
  }

  // 4. Every schema needs both kinds of examples.
  for (const [name, counts] of exampleCounts) {
    for (const kind of EXAMPLE_KINDS) {
      if (counts[kind] === 0) {
        errors.push(`schemas/${name}.json: no ${kind} example in examples/${name}/${kind}/`);
      }
    }
  }

  // 5. The endpoint table.
  const endpointsFile = join(root, 'endpoints.json');
  if (existsSync(endpointsFile)) {
    try {
      errors.push(...checkEndpoints(readJson(endpointsFile), [...schemas.keys()]));
    } catch (err) {
      errors.push(`endpoints.json: invalid JSON: ${err.message}`);
    }
  } else if ([...schemas.keys()].some((name) => name.startsWith('api/'))) {
    errors.push('endpoints.json: missing, but there are api/ schemas');
  }

  return { errors, info, stats };
}

function main(argv) {
  const verbose = argv.includes('--verbose') || argv.includes('-v');
  const rootIndex = argv.indexOf('--root');
  const root = rootIndex >= 0 ? resolve(argv[rootIndex + 1]) : resolve(fileURLToPath(import.meta.url), '..', '..');

  const { errors, info, stats } = validateRepo(root, { verbose });
  for (const line of info) console.log(line);
  for (const line of errors) console.error(`FAIL ${line}`);

  const rel = relative(process.cwd(), root);
  const where = rel.startsWith('..') ? root : rel.split(sep).join('/') || '.';
  const summary = `${stats.schemas} schemas, ${stats.valid} valid and ${stats.invalid} invalid examples checked in ${where}`;
  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s); ${summary}`);
    return 1;
  }
  if (stats.schemas === 0) console.warn('warning: no schemas found');
  console.log(summary);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

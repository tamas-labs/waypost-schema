#!/usr/bin/env node
// Validates the schema repository:
//   1. every schemas/**/*.json is a draft 2020-12 schema whose $id matches its path and which compiles
//      (all schemas are registered first, so cross-file $refs resolve);
//   2. every examples/<schema path>/valid/*.json validates against schemas/<schema path>.json;
//   3. every examples/<schema path>/invalid/*.json fails against it;
//   4. every schema has at least one valid and one invalid example.
// Exits with 1 if anything fails. Usage: node scripts/validate.js [--verbose] [--root <dir>]

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';
export const SCHEMA_ID_BASE = 'https://waypost.dev/schema/';

const EXAMPLE_KINDS = ['valid', 'invalid'];

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
  for (const file of listFiles(examplesDir)) {
    const rel = `examples/${file}`;
    const parts = file.split('/');
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
    } else if (verbose) {
      info.push(kind === 'valid' ? `ok   ${rel}` : `ok   ${rel} (rejected: ${formatErrors(validate.errors)})`);
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

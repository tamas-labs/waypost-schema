// @waypost/schema: the JSON Schemas of the Waypost contract and their TypeScript types (lib/index.d.ts).

import endpoints from './generated/endpoints.js';
import schemas from './generated/schemas.js';
import version from './generated/version.js';

/** Version of this package (package.json), e.g. "0.5.0"; the backend has the same in Waypost\Schema\Paths::VERSION. */
export const SCHEMA_VERSION = version;

/** Common prefix of every schema $id; its v1 is the API version (/v1), not the package version. */
export const SCHEMA_ID_BASE = 'https://waypost.dev/schema/v1/';

/** Every schema, keyed by its path under schemas/ without .json (e.g. "api/sync-pull.response"). */
export { schemas };

/** endpoints.json: every endpoint of the API with its method, path, auth, headers, query, request and responses. */
export { endpoints };

/** The $id of a schema, e.g. for ajv.getSchema(schemaId('api/sync-pull.response')). */
export function schemaId(path) {
  if (!Object.hasOwn(schemas, path)) throw new Error(`Unknown schema: ${path}`);
  return `${SCHEMA_ID_BASE}${path}.json`;
}

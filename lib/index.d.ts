// @waypost/schema: the JSON Schemas of the Waypost contract and their TypeScript types.

export type * from '../types/index.js';
import type { SchemaTypes } from '../types/index.js';

/** Path of a schema under schemas/ without .json, e.g. "api/sync-pull.response". */
export type SchemaPath = keyof SchemaTypes;

/** A JSON Schema (draft 2020-12) of this package. Do not modify it. */
export interface JsonSchema {
  readonly $schema: 'https://json-schema.org/draft/2020-12/schema';
  readonly $id: string;
  readonly [keyword: string]: unknown;
}

/** Common prefix of every schema $id. */
export declare const SCHEMA_ID_BASE: 'https://waypost.dev/schema/';

/** Every schema, keyed by its path under schemas/ without .json. Add them all to a validator (e.g. Ajv 2020). */
export declare const schemas: { readonly [P in SchemaPath]: JsonSchema };

/** The $id of a schema, e.g. for ajv.getSchema(schemaId('api/sync-pull.response')). Throws for an unknown path. */
export declare function schemaId<P extends SchemaPath>(path: P): `https://waypost.dev/schema/${P}.json`;

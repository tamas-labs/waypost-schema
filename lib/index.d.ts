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

/** Version of this package (package.json), e.g. "0.5.0"; the backend has the same in Waypost\Schema\Paths::VERSION. */
export declare const SCHEMA_VERSION: string;

/** Common prefix of every schema $id; its v1 is the API version (/v1), not the package version. */
export declare const SCHEMA_ID_BASE: 'https://waypost.dev/schema/v1/';

/** Every schema, keyed by its path under schemas/ without .json. Add them all to a validator (e.g. Ajv 2020). */
export declare const schemas: { readonly [P in SchemaPath]: JsonSchema };

/** The $id of a schema, e.g. for ajv.getSchema(schemaId('api/sync-pull.response')). Throws for an unknown path. */
export declare function schemaId<P extends SchemaPath>(path: P): `https://waypost.dev/schema/v1/${P}.json`;

/** Who may call an endpoint (endpoints.json auth). */
export type EndpointAuth = 'none' | 'supervisor' | 'device' | 'acting' | 'revoked' | 'signed_url';

/** A request or response body: a JSON (or multipart) body with its schema, or a binary one without. */
export type EndpointBody =
  | { readonly content_type: 'application/json' | 'multipart/form-data'; readonly schema: SchemaPath }
  | { readonly content_type: 'image/jpeg' | 'application/pdf'; readonly schema: null };

/** One endpoint of endpoints.json. */
export interface Endpoint {
  /** Unique; the backend route name without its waypost. prefix, e.g. "sites.store". */
  readonly name: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Relative to the API base (which ends in /v1); {name} is a path parameter, e.g. "/sites/{site}". */
  readonly path: string;
  readonly path_parameters: { readonly [name: string]: SchemaPath };
  /** Who may call it; any of these. */
  readonly auth: readonly EndpointAuth[];
  /** Requires an Idempotency-Key header (common/idempotency-key). */
  readonly idempotency_key: boolean;
  /** Schema of the query parameters; null: none. */
  readonly query: SchemaPath | null;
  readonly request: EndpointBody | null;
  /** The success responses by HTTP status; any other status is error_response. */
  readonly responses: { readonly [status: string]: EndpointBody };
  readonly description?: string;
}

/** endpoints.json */
export interface EndpointTable {
  readonly description: string;
  readonly api_version: string;
  /** The schema of every error response. */
  readonly error_response: SchemaPath;
  readonly auth: { readonly [kind in EndpointAuth]?: string };
  readonly headers: { readonly [name: string]: { readonly schema: SchemaPath; readonly description: string } };
  readonly endpoints: readonly Endpoint[];
}

/** endpoints.json: every endpoint of the API. */
export declare const endpoints: EndpointTable;

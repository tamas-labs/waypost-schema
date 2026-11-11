<?php

declare(strict_types=1);

namespace Waypost\Schema;

use InvalidArgumentException;

/**
 * File locations of the waypost/schema package: the JSON Schemas and the shared test vectors.
 *
 * A schema is named by its path under schemas/ without .json, e.g. "api/sync-push.request"; its $id is
 * SCHEMA_ID_BASE . name . '.json'. A validator can therefore map the ID prefix to the schema directory,
 * e.g. with opis/json-schema: $validator->resolver()->registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/').
 */
final class Paths
{
    /**
     * Version of this package, e.g. "0.5.0". Composer does not know it from a path repository (it reports dev-main
     * there), so it is kept here, equal to package.json (scripts/release.test.js); npm: SCHEMA_VERSION.
     */
    public const string VERSION = '0.9.0';

    /**
     * Common prefix of every schema $id. Its v1 is the API version (/v1), not the package version: a /v2 schema set
     * gets its own prefix, so both can be loaded into one validator (docs/decisions.md, SCH-008).
     */
    public const string SCHEMA_ID_BASE = 'https://waypost.dev/schema/v1/';

    private const string NAME_PATTERN = '~^[a-z0-9]+(?:[-._][a-z0-9]+)*/[a-z0-9]+(?:[-._][a-z0-9]+)*$~';

    private function __construct()
    {
    }

    /** Root directory of the package. */
    public static function root(): string
    {
        return dirname(__DIR__);
    }

    /** Directory of the schemas (schemas/), without a trailing slash. */
    public static function schemaDirectory(): string
    {
        return self::root() . '/schemas';
    }

    /**
     * Absolute path of a schema file.
     *
     * @throws InvalidArgumentException for a malformed or unknown name
     */
    public static function schema(string $name): string
    {
        if (preg_match(self::NAME_PATTERN, $name) !== 1) {
            throw new InvalidArgumentException("Malformed schema name: {$name}");
        }
        $path = self::schemaDirectory() . "/{$name}.json";
        if (!is_file($path)) {
            throw new InvalidArgumentException("Unknown schema: {$name}");
        }

        return $path;
    }

    /**
     * The $id of a schema, e.g. https://waypost.dev/schema/v1/api/sync-push.request.json.
     *
     * @throws InvalidArgumentException for a malformed or unknown name
     */
    public static function schemaId(string $name): string
    {
        self::schema($name);

        return self::SCHEMA_ID_BASE . $name . '.json';
    }

    /**
     * Names of every schema, sorted.
     *
     * @return list<string>
     */
    public static function schemaNames(): array
    {
        $prefix = self::schemaDirectory() . '/';
        $names = array_map(
            static fn (string $path): string => substr($path, strlen($prefix), -strlen('.json')),
            glob($prefix . '*/*.json') ?: [],
        );
        sort($names, SORT_STRING);

        return $names;
    }

    /**
     * Directory of the example instances (examples/), without a trailing slash: <schema name>/valid/*.json and
     * <schema name>/invalid/*.json, e.g. examples/api/sync-push.request/valid/. Part of the package, also of its
     * archive, so that a consumer's tests can run them against its own validator.
     */
    public static function examplesDirectory(): string
    {
        return self::root() . '/examples';
    }

    /** endpoints.json: every endpoint of the API (method, path, auth, headers, query, request and response schemas). */
    public static function endpoints(): string
    {
        return self::root() . '/endpoints.json';
    }

    /** chain/test-vectors.json: entry → canonical JSON → HMAC. */
    public static function chainVectors(): string
    {
        return self::root() . '/chain/test-vectors.json';
    }

    /** schedule/test-vectors.json: schedule and period → expected round times, default time limit. */
    public static function scheduleVectors(): string
    {
        return self::root() . '/schedule/test-vectors.json';
    }

    /** pin/test-vectors.json: PIN, salt and iterations → PBKDF2-HMAC-SHA256 verifier; malformed PINs. */
    public static function pinVectors(): string
    {
        return self::root() . '/pin/test-vectors.json';
    }
}

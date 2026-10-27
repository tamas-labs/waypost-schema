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
    /** Common prefix of every schema $id. */
    public const string SCHEMA_ID_BASE = 'https://waypost.dev/schema/';

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
     * The $id of a schema, e.g. https://waypost.dev/schema/api/sync-push.request.json.
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
}

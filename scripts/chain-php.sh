#!/bin/sh
# Runs chain/test-vectors.json through PHP: the canonical JSON recipe of docs/decisions.md (json_decode into arrays,
# integral floats back to integers, recursive ksort, json_encode with the documented flags), and for the raw texts
# (normalized, invalid) the whole verification: json_decode, opis/json-schema against chain/entry.json, canonical
# JSON without hash, HMAC. Fails if PHP gets any vector differently from scripts/chain-vectors.js. Needs Docker
# (composer:2 image); no local PHP or Composer. Usage:
#   sh scripts/chain-php.sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/composer.json" <<'JSON'
{
    "name": "waypost/schema-chain-php",
    "repositories": [{ "type": "path", "url": "/schema" }],
    "require": { "waypost/schema": "*@dev", "opis/json-schema": "^2.6" }
}
JSON

cat > "$WORK/check.php" <<'PHP'
<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Opis\JsonSchema\Validator;
use Waypost\Schema\Paths;

const MAX_SAFE_INTEGER = 9007199254740991;
const FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR;

/** The recipe of docs/decisions.md ("A kanonikus JSON pontos szabályai"), on json_decode(..., true) output. */
function normalize(mixed $value): mixed
{
    if (is_array($value)) {
        if (!array_is_list($value)) {
            ksort($value, SORT_STRING);
        }

        return array_map(normalize(...), $value);
    }
    if (is_float($value)) {
        if (floor($value) !== $value || abs($value) > MAX_SAFE_INTEGER) {
            throw new InvalidArgumentException("floating-point number {$value}");
        }

        return (int) $value;
    }
    if (is_int($value) && abs($value) > MAX_SAFE_INTEGER) {
        throw new InvalidArgumentException("integer {$value} outside ±(2^53 − 1)");
    }

    return $value;
}

function canonicalJson(mixed $value): string
{
    return json_encode(normalize($value), FLAGS);
}

$vectors = json_decode((string) file_get_contents(Paths::chainVectors()), true, flags: JSON_THROW_ON_ERROR);
$key = base64_decode($vectors['key_base64'], true);
$validator = new Validator();
$validator->resolver()?->registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/');

/** @return array{result: string, canonical_json?: string, hash?: string} */
function verify(string $text, Validator $validator, string $key): array
{
    try {
        $object = json_decode($text, false, flags: JSON_THROW_ON_ERROR);
        if (!$validator->validate($object, Paths::schemaId('chain/entry'))->isValid()) {
            return ['result' => 'invalid'];
        }
        $entry = json_decode($text, true, flags: JSON_THROW_ON_ERROR);
        $hash = $entry['hash'];
        unset($entry['hash']);
        $canonical = canonicalJson($entry);
    } catch (JsonException | InvalidArgumentException) {
        return ['result' => 'invalid'];
    }
    $computed = hash_hmac('sha256', $canonical, $key);

    return hash_equals($computed, $hash) ? ['result' => 'ok', 'canonical_json' => $canonical, 'hash' => $computed] : ['result' => 'bad_hmac'];
}

$failures = 0;
$fail = static function (string $name, string $message) use (&$failures): void {
    fwrite(STDERR, "FAIL {$name}: {$message}\n");
    $failures++;
};

$inputs = [...$vectors['cases'], ...$vectors['chain']['entries']];
foreach ($inputs as $vector) {
    $name = $vector['name'] ?? $vector['input']['id'];
    $canonical = canonicalJson($vector['input']);
    if ($canonical !== $vector['canonical_json']) {
        $fail($name, "canonical JSON differs:\n  php:     {$canonical}\n  vector:  {$vector['canonical_json']}");
    } elseif (hash_hmac('sha256', $canonical, $key) !== $vector['hash']) {
        $fail($name, 'hash differs');
    }
}
foreach ($vectors['normalized']['cases'] as $vector) {
    $got = verify($vector['entry_json'], $validator, $key);
    $want = ['result' => 'ok', 'canonical_json' => $vector['canonical_json'], 'hash' => $vector['hash']];
    if ($got !== $want) {
        $fail("normalized/{$vector['name']}", 'php: ' . json_encode($got, FLAGS));
    }
}
foreach ($vectors['invalid']['cases'] as $vector) {
    $got = verify($vector['entry_json'], $validator, $key)['result'];
    if ($got !== $vector['expected']) {
        $fail("invalid/{$vector['name']}", "php: {$got}, expected: {$vector['expected']}");
    }
}

if ($failures > 0) {
    fwrite(STDERR, "\n{$failures} chain vector(s) computed differently by PHP\n");
    exit(1);
}
printf(
    "ok: PHP %s agrees on %d canonical, %d normalized and %d invalid chain vectors\n",
    PHP_VERSION,
    count($inputs),
    count($vectors['normalized']['cases']),
    count($vectors['invalid']['cases']),
);
PHP

docker run --rm \
  -u "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer \
  -v "$ROOT":/schema:ro -v "$WORK":/app -w /app \
  composer:2 sh -c 'composer install --no-interaction --no-progress --quiet && php check.php'

#!/bin/sh
# Runs every example (examples/<schema path>/valid|invalid/*.json) through opis/json-schema, the validator of the
# backend, with the schemas resolved as the backend does (registerPrefix). Fails if opis decides any example
# differently from what its directory says, i.e. differently from Ajv (scripts/validate.js). Needs Docker
# (composer:2 image); no local PHP or Composer. Usage:
#   sh scripts/opis-parity.sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/composer.json" <<'JSON'
{
    "name": "waypost/schema-opis-parity",
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

$validator = new Validator();
$validator->resolver()?->registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/');

$examples = $argv[1];
$files = [];
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($examples, FilesystemIterator::SKIP_DOTS)) as $file) {
    $files[] = substr($file->getPathname(), strlen($examples) + 1);
}
sort($files, SORT_STRING);

$failures = 0;
$counts = ['valid' => 0, 'invalid' => 0];
foreach ($files as $file) {
    if (str_ends_with($file, '/expected-errors.json')) {
        continue; // the expected Ajv errors of the invalid examples (scripts/validate.js)
    }
    if (preg_match('~^(.+)/(valid|invalid)/[^/]+\.json$~', $file, $match) !== 1) {
        fwrite(STDERR, "FAIL examples/{$file}: not examples/<schema path>/(valid|invalid)/<name>.json\n");
        $failures++;

        continue;
    }
    [, $name, $kind] = $match;
    $data = json_decode((string) file_get_contents("{$examples}/{$file}"), flags: JSON_THROW_ON_ERROR);
    $valid = $validator->validate($data, Paths::schemaId($name))->isValid();
    $counts[$kind]++;
    if ($valid !== ($kind === 'valid')) {
        fwrite(STDERR, "FAIL examples/{$file}: opis says " . ($valid ? 'valid' : 'invalid') . "\n");
        $failures++;
    }
}

if ($counts['valid'] === 0 || $counts['invalid'] === 0) {
    fwrite(STDERR, "FAIL no examples found in {$examples}\n");
    exit(1);
}
if ($failures > 0) {
    fwrite(STDERR, "\n{$failures} example(s) decided differently by opis/json-schema\n");
    exit(1);
}
$opis = Composer\InstalledVersions::getPrettyVersion('opis/json-schema');
echo "ok: opis/json-schema {$opis} agrees on {$counts['valid']} valid and {$counts['invalid']} invalid examples\n";
PHP

docker run --rm \
  -u "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer \
  -v "$ROOT":/schema:ro -v "$WORK":/app -w /app \
  composer:2 sh -c 'composer install --no-interaction --no-progress --quiet && php check.php /schema/examples'

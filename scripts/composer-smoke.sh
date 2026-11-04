#!/bin/sh
# Installs waypost/schema into an empty Composer project from a path repository and checks the PHP helper
# (src/Paths.php) there. Needs Docker (composer:2 image); no local PHP or Composer. Usage:
#   sh scripts/composer-smoke.sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/composer.json" <<'JSON'
{
    "name": "waypost/schema-smoke",
    "repositories": [{ "type": "path", "url": "/schema" }],
    "require": { "waypost/schema": "*@dev" }
}
JSON

cat > "$WORK/check.php" <<'PHP'
<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Waypost\Schema\Paths;

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$names = Paths::schemaNames();
check(count($names) >= 35, 'at least 35 schemas');
check(in_array('chain/entry', $names, true) && in_array('api/sync-push.request', $names, true), 'known schema names');
foreach ($names as $name) {
    $schema = json_decode((string) file_get_contents(Paths::schema($name)), true, flags: JSON_THROW_ON_ERROR);
    check($schema['$id'] === Paths::schemaId($name), "\$id of {$name}");
}
check(str_starts_with(Paths::schema('chain/entry'), Paths::schemaDirectory() . '/'), 'schema path inside the schema directory');

$chain = json_decode((string) file_get_contents(Paths::chainVectors()), true, flags: JSON_THROW_ON_ERROR);
check(count($chain['cases']) > 0 && strlen($chain['key_hex']) === 64, 'chain vectors');
$schedule = json_decode((string) file_get_contents(Paths::scheduleVectors()), true, flags: JSON_THROW_ON_ERROR);
check(count($schedule['expansion']) > 0, 'schedule vectors');
$pin = json_decode((string) file_get_contents(Paths::pinVectors()), true, flags: JSON_THROW_ON_ERROR);
check(count($pin['cases']) > 0 && $pin['defaults']['iterations'] === 100000, 'pin vectors');
$endpoints = json_decode((string) file_get_contents(Paths::endpoints()), true, flags: JSON_THROW_ON_ERROR);
$pull = array_values(array_filter($endpoints['endpoints'], static fn (array $e): bool => $e['name'] === 'sync.pull'))[0] ?? null;
check($pull !== null && $pull['path'] === '/sync/pull' && is_file(Paths::schema($pull['responses']['200']['schema'])), 'endpoint table');

foreach (['../package', 'chain/../../composer', 'chain/entry.json', 'Chain/Entry', 'entry', 'chain/nope'] as $bad) {
    try {
        Paths::schema($bad);
        check(false, "rejects {$bad}");
    } catch (InvalidArgumentException) {
    }
}

check(preg_match('/^[0-9]+\.[0-9]+\.[0-9]+$/', Paths::VERSION) === 1, 'Paths::VERSION');

$installed = Composer\InstalledVersions::getPrettyVersion('waypost/schema');
echo 'ok: waypost/schema ' . Paths::VERSION . " (Composer: {$installed}), " . count($names) . " schemas, " . count($endpoints['endpoints']) . " endpoints, vectors readable\n";
PHP

docker run --rm \
  -u "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer \
  -v "$ROOT":/schema:ro -v "$WORK":/app -w /app \
  composer:2 sh -c 'composer install --no-interaction --no-progress --quiet && php check.php'

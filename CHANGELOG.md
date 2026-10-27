# Changelog

A csomag minden lényeges változása ebben a fájlban szerepel.

A formátum a [Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi, a verziózás [Semantic Versioning](https://semver.org/lang/hu/):

- **major**: törő változás (egy eddig érvényes példány érvénytelenné válik, vagy egy mező jelentése megváltozik) – az API-ban új `/vN` előtaggal jár;
- **minor**: visszafelé kompatibilis bővítés (új séma, új opcionális mező, új enum-érték, ahol a fogadó fél ezt elviseli);
- **patch**: javítás, amely nem változtat az érvényes példányok körén (leírás, példa, tesztvektor-pontosítás).

## [Unreleased]

### Added

- Repo váz: `package.json` (`@waypost/schema`), `composer.json` (`waypost/schema`), `CLAUDE.md`, `CHANGELOG.md`, `.gitignore`, `docs/decisions.md`, könyvtárszerkezet (`schemas/entities|api|chain`, `chain/`, `schedule/`, `examples/`, `scripts/`).
- `scripts/validate.js` (`npm test`, `npm run validate`): Ajv (draft 2020-12, strict mód) alapú ellenőrzés – minden séma lefordul, az `$id` egyezik a fájl útvonalával, minden `examples/**/valid/*` példa validál, minden `examples/**/invalid/*` elbukik, és minden sémához van mindkét fajta példa. A szkript saját tesztjei: `scripts/validate.test.js` (`node --test`).
- Közös sémák (`schemas/common/`): `uuid` (UUIDv7, kisbetűs), `timestamp` (ISO 8601 UTC, ezredmásodperc), `server-time`, `hash` (64 kisbetűs hex), `base64` (szabványos, kitöltéssel), `lat-e7`, `lng-e7`, `accuracy-dm` (egészek), `error-code` (a specifikáció 10 hibakódja).
- `schemas/common/local-time.json` (`HH:MM`).
- Konfigurációs entitások (`schemas/entities/`): `site`, `user` (pull változat: PIN-ellenőrzővel és `site_ids`-szel, e-mail és jelszó nélkül), `device`, `checkpoint` (egész számú hely, `tag_uid` és QR payload formátum), `route`, `route-version`, `route-version-checkpoint`, `schedule` (`list` / `interval` mód, `weekdays` bitmaszk), `report-subscription`. Minden mező kötelezően jelen van, a hiányzó érték `null`.
- `schemas/api/error.json`: a hibaválasz (`server_time`, `error.code`, `error.message`, `error.details`).

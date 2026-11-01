# Changelog

A csomag minden lényeges változása ebben a fájlban szerepel.

A formátum a [Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi, a verziózás [Semantic Versioning](https://semver.org/lang/hu/):

- **major**: törő változás (egy eddig érvényes példány érvénytelenné válik, vagy egy mező jelentése megváltozik) – az API-ban új `/vN` előtaggal jár;
- **minor**: visszafelé kompatibilis bővítés (új séma, új opcionális mező, új enum-érték, ahol a fogadó fél ezt elviseli);
- **patch**: javítás, amely nem változtat az érvényes példányok körén (leírás, példa, tesztvektor-pontosítás).

## [Unreleased]

## [0.2.0] – 2026-11-01

Visszafelé kompatibilis bővítés: a konfigurációs CRUD végpontok sémái, PIN-tesztvektorok, a pull `reset` mezője, két új hibakód.

### Added

- PIN-tesztvektorok (Q11): `pin/test-vectors.json` – PIN, só és iterációszám → PBKDF2-HMAC-SHA256 ellenőrző (`pin_hash`), ugyanazokkal a mezőnevekkel, mint az `entities/user`; nem egyező PIN-ek és hibás alakú PIN-ek (köztük a záró sortörés). Generátor: `scripts/pin-vectors.js` (`npm run vectors:pin`); a teszt WebCryptóval, a generátortól függetlenül számolja újra. Elérés: `@waypost/schema/vectors` → `pinVectors` (típus: `PinVectors`), `@waypost/schema/pin/test-vectors.json`, Composer: `Paths::pinVectors()`.
- Hibakódok: `bad_request` (minden más 4xx válasz, pl. 405, 413) és `server_error` (minden 5xx válasz, pl. 500, 503); a HTTP-státusz az eredeti marad.
- A konfigurációs CRUD végpontok sémái (M5-01, a backend M2-16 – M2-21 feladataihoz előrehozva), `schemas/api/`:
  - kérések: `site-create`, `site-update`, `site-user-attach`, `user-create`, `user-update`, `user-pin`, `checkpoint-create`, `checkpoint-update`, `route-create`, `route-update`, `route-version-create`, `schedule-create`, `schedule-update`, `report-subscription-create`, `report-subscription-update` (`.request`);
  - válaszok: `site`, `site-list`, `user` (a generált PIN-nel, egyszer), `user-list`, `checkpoint`, `checkpoint-list`, `route`, `route-list`, `route-version` (a verzió, a pontjai és az útvonal), `route-version-list`, `schedule`, `schedule-list`, `report-subscription`, `report-subscription-list`, `deleted` (`.response`).
  - A létrehozó kérésekben opcionális `id` (az app által generált UUIDv7, az outboxhoz).
- Közös sémák: `common/timezone` (IANA időzóna neve), `common/pin` (6 számjegy, szövegként; a minta a `pin/test-vectors.json` `pin_pattern`-je, ezt teszt ellenőrzi).

### Changed

- `api/sync-pull.response`: új, opcionális `reset` mező (a hiánya `false`): `true`, ha az oldal teljes állapotot kezd, mert a kérésben nem volt kurzor, vagy a hívó által látott telephelyek köre a kurzor óta megváltozott; a kliens ilyenkor az oldal alkalmazása előtt törli a helyi konfigurációs rekordjait. A leírás szerint egy útvonalverzió mindig az összes pontjával együtt jön (egy ilyen oldalon 501 rekord is lehet), és a hibás kurzor validációs hiba (422).
- `entities/site`: a `timezone` a `common/timezone`-ra hivatkozik (ugyanaz a minta, az érvényes példányok köre nem változik).

## [0.1.0] – 2026-10-27

Az első telepíthető változat: a pull, push, enroll és login végpontok, az entitások és a láncbejegyzések sémái, a lánc- és menetrend-tesztvektorok, TS típusok.

### Added

- Repo váz: `package.json` (`@waypost/schema`), `composer.json` (`waypost/schema`), `CLAUDE.md`, `CHANGELOG.md`, `.gitignore`, `docs/decisions.md`, könyvtárszerkezet (`schemas/entities|api|chain`, `chain/`, `schedule/`, `examples/`, `scripts/`).
- `scripts/validate.js` (`npm test`, `npm run validate`): Ajv (draft 2020-12, strict mód) alapú ellenőrzés – minden séma lefordul, az `$id` egyezik a fájl útvonalával, minden `examples/**/valid/*` példa validál, minden `examples/**/invalid/*` elbukik, és minden sémához van mindkét fajta példa. A szkript saját tesztjei: `scripts/validate.test.js` (`node --test`).
- Közös sémák (`schemas/common/`): `uuid` (UUIDv7, kisbetűs), `timestamp` (ISO 8601 UTC, ezredmásodperc), `server-time`, `hash` (64 kisbetűs hex), `base64` (szabványos, kitöltéssel), `lat-e7`, `lng-e7`, `accuracy-dm` (egészek), `error-code` (a specifikáció 10 hibakódja).
- `schemas/common/local-time.json` (`HH:MM`).
- Konfigurációs entitások (`schemas/entities/`): `site`, `user` (pull változat: PIN-ellenőrzővel és `site_ids`-szel, e-mail és jelszó nélkül), `device`, `checkpoint` (egész számú hely, `tag_uid` és QR payload formátum), `route`, `route-version`, `route-version-checkpoint`, `schedule` (`list` / `interval` mód, `weekdays` bitmaszk), `report-subscription`. Minden mező kötelezően jelen van, a hiányzó érték `null`.
- Láncsémák (`schemas/chain/`): `entry` (a küldött bejegyzés `hash`-sel; minden mező kötelező, a `null` értékű is; a `type` szerint a megfelelő payloadséma), `payload-shift_started`, `payload-shift_closed`, `payload-round_opened`, `payload-scan`, `payload-incident`, `payload-round_closed`. Lebegőpontos szám sehol; a fotók `media: [{id, sha256}]` alakban (a `media_ids` helyett).
- Lánc-tesztvektorok: `chain/test-vectors.json` (rögzített kulcs; `input` → `canonical_json` → `hash`; minden bejegyzéstípus, `null` mezők, ékezetes és nem-BMP Unicode, escape-csapdák, nagy egészek, fordított kulcssorrend, 3 elemű lánc), a referencia-generátor `scripts/chain-vectors.js` (`npm run vectors:chain`) és a szigorú RFC 8785 implementáció `scripts/jcs.js`.
- Menetrend-tesztvektorok: `schedule/test-vectors.json` (`list` és `interval` mód, éjfélen átnyúló ablak, `weekdays` a kezdő napra, mindkét 2026-os DST-váltás Europe/Budapest időzónában a Q5 döntés szerint, időkeret-alapérték), generátor: `scripts/schedule-vectors.js` (`npm run vectors:schedule`).
- `schemas/api/error.json`: a hibaválasz (`server_time`, `error.code`, `error.message`, `error.details`).
- API-sémák (`schemas/api/`): `auth-login.request/response`, `auth-logout.response`, `devices-enroll.request/response`, `sync-pull.response` (`cursor`, `has_more`, minden `changes` és `deleted` lista kötelező; `devices` és `report_subscriptions` is), `sync-push.request/response` (`accepted`, `last_seq`, `rejected[]`, `media_missing[]`). Minden válaszban kötelező a `server_time`.
- TS típusok: `types/index.d.ts` (a `@waypost/schema` főbelépője exportálja), a sémákból a `scripts/types.js` generálja (`npm run types`) json-schema-to-typescript-tel. Sémánként egy nevesített típus, a láncbejegyzés `type` szerinti diszkriminált unió (`ChainEntry`), a hash nélküli bejegyzés (`UnsignedChainEntry`), `SchemaTypes` térkép. Ellenőrzés `tsc --strict`-tel (`npm run typecheck`, `scripts/types-sample.ts`); a teszt az összes érvényes példát is lefordítja a típusokkal.
- npm-csomag (`@waypost/schema`, `file:../waypost-schema`): `exports` – `.` (`schemas`, `schemaId()`, `SCHEMA_ID_BASE` és minden típus), `./vectors` (`chainVectors`, `scheduleVectors` típusosan), valamint a JSON-fájlok (`./schemas/*`, `./chain/test-vectors.json`, `./schedule/test-vectors.json`). A sémák és a vektorok beágyazott ES-modulként is megvannak (`lib/generated/`, `npm run embed`), mert a React Native (Metro) JSON-t import-attribútummal nem tud betölteni. Az `npm test` üres npm-projektbe telepítve is kipróbálja (Node; TypeScript `nodenext` és `bundler` feloldással).
- Composer-csomag (`waypost/schema`, `path` repository): `Waypost\Schema\Paths` – a sémák könyvtára és fájljai, az `$id`-k, a sémanevek listája és a tesztvektorok útvonala. Ellenőrzés: `sh scripts/composer-smoke.sh` (Docker).

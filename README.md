# waypost-schema

A Waypost közös szerződése. Az app (`waypost`, React Native) és a backend (`laravel-waypost`, Laravel-csomag) ebből a repóból veszi:

- a **JSON Schemákat** (draft 2020-12) az API kéréseihez, válaszaihoz és query paramétereihez, az entitásokhoz és a láncbejegyzésekhez;
- a **végponttáblát** (`endpoints.json`): metódus, útvonal, ki hívhatja, fejlécek, query-, kérés- és válaszséma;
- a közös **tesztvektorokat**: lánc (kanonikus JSON → HMAC), menetrend-kibontás (DST-vel), PIN-ellenőrző.

Ha az API vagy a lánc formátuma változik, **előbb itt** kell módosítani, új verzióval, és csak utána a két fogyasztóban.

A szabályok és az eldöntött kérdések: [`docs/decisions.md`](docs/decisions.md). A változások: [`CHANGELOG.md`](CHANGELOG.md). A forrás minden mezőhöz és szabályhoz a fejlesztői specifikáció (`../waypost/docs/`).

## Tartalom

| Hely | Mi van benne |
|---|---|
| `schemas/common/` | Közös típusok: UUIDv7, időbélyeg, lenyomat, base64, koordináta, hibakód, kurzor, `Idempotency-Key` … |
| `schemas/entities/` | Az entitások hálózati alakja (minden mező jelen van, a hiányzó érték `null`) |
| `schemas/chain/` | A láncbejegyzés (`entry.json`) és a típusonkénti payloadok |
| `schemas/api/` | `<végpont>.request.json`, `<végpont>.response.json`, `<lista>.query.json`, `error.json` |
| `endpoints.json` | Mind a 48 végpont (lásd lent) |
| `chain/test-vectors.json` | Bejegyzés → kanonikus JSON → HMAC; nyers szövegek normalizálása és elutasítása |
| `schedule/test-vectors.json` | Menetrend + időszak → várt körök (DST, naptárhatárok, több időzóna); alapértelmezett időkeret |
| `pin/test-vectors.json` | PIN + só + iterációszám → PBKDF2-ellenőrző; hibás alakú PIN-ek |
| `types/index.d.ts` | TS típusok a sémákból (generált) |
| `lib/` | npm-exportok; `lib/generated/` = beágyazott JSON (generált) |
| `src/Paths.php` | Composer: `Waypost\Schema\Paths` – útvonalak, `$id`-k, verzió |
| `examples/` | Minden sémához érvényes és érvénytelen példák |

Minden séma `$id`-ja `https://waypost.dev/schema/v1/<útvonal a schemas/ alatt>`, pl. `https://waypost.dev/schema/v1/api/sync-push.request.json`. A `v1` az API főverziója, nem a csomagé. A sémák egymásra relatív `$ref`-fel hivatkoznak. Az URI csak azonosító, a hálózatról soha nem töltődik le.

## Telepítés

Mindkét fogyasztó a szomszédos munkakönyvtárat használja (`../waypost-schema`), egy rögzített tagen. A tag a fogyasztó `.waypost-schema-version` fájljában van (pl. `v0.6.0`), a CI ezt a tagot veszi ki a fogyasztó mellé, és a fogyasztó tesztje ellenőrzi, hogy a futásidejű verzió egyezik vele.

**npm** (app):

```json
"dependencies": { "@waypost/schema": "file:../waypost-schema" }
```

A `file:` függőség symlink, telepítéskor nincs build. A generált fájlok (`types/`, `lib/generated/`) ezért commitolva vannak.

**Composer** (backend):

```json
"require": { "waypost/schema": "^0.6" },
"repositories": [{
  "type": "path",
  "url": "../waypost-schema",
  "options": { "symlink": true, "versions": { "waypost/schema": "0.6.0" } }
}]
```

`path` repositoryból a Composer `dev-main`-t lát, ezért a verziót az `options.versions` adja meg. Pin-léptetéskor a `.waypost-schema-version`, a `require` és az `options.versions` együtt változik.

**Futásidejű verzió:** npm-en `SCHEMA_VERSION`, Composerrel `Paths::VERSION`. A backend minden válaszában `X-Waypost-Schema: <verzió>` fejléc jön. Az app `__DEV__`-ben figyelmeztet, ha ennek a major vagy a minor része eltér a sajátjától.

## Validálás

A két oldalnak ugyanúgy kell döntenie. A CI minden példát mindkét validátorral lefuttat.

**JavaScript (Ajv 8, draft 2020-12)** – pontosan ezekkel a beállításokkal:

```js
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { schemaId, schemas } from '@waypost/schema';

const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: true, strictTuples: true, strictRequired: false });
addFormats(ajv); // nélküle a format (date-time, email, uri) nincs ellenőrizve
for (const schema of Object.values(schemas)) ajv.addSchema(schema); // mind, hogy a $ref-ek feloldódjanak

const validate = ajv.getSchema(schemaId('api/sync-push.request'));
if (!validate(body)) console.log(validate.errors);
```

A típusok: `import type { SyncPushRequest, ChainEntry, SchemaTypes } from '@waypost/schema'`. A `SchemaTypes['api/sync-push.request']` a séma útvonalából adja a típust. A típusok csak az alakot írják le. A mintákat, a tartományokat és a feltételes szabályokat a sémaellenőrzés nézi, kivéve a láncbejegyzés `type` → `payload` ágait, amelyekből a `ChainEntry` diszkriminált unió lesz.

**PHP (opis/json-schema 2.6)**:

```php
use Opis\JsonSchema\Validator;
use Waypost\Schema\Paths;

$validator = new Validator();
$validator->resolver()->registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/');

$result = $validator->validate(json_decode($json), Paths::schemaId('api/sync-push.request'));
```

Az opis objektumokon dolgozik: `json_decode($json)` asszociatív tömb nélkül, különben az üres objektum tömb lesz. A formátumellenőrzés alapból be van kapcsolva.

## Végponttábla

Az `endpoints.json` (npm: `endpoints`, típusa `EndpointTable`; Composer: `Paths::endpoints()`) végpontonként megadja:

- `name`: a backend útvonalneve `waypost.` nélkül, pl. `sites.store`;
- `method`, `path` (az API-alaphoz képest, amely `/v1`-re végződik) és `path_parameters`;
- `auth`: ki hívhatja: `none`, `supervisor`, `device`, `acting` (eszköztoken + `X-Acting-User`), `revoked`, `signed_url`;
- `idempotency_key`: kell-e `Idempotency-Key` fejléc (`common/idempotency-key.json`, a protokoll leírásával);
- `query`, `request`, `responses`: séma, illetve státusz → `{ content_type, schema }`.

Minden más státusz válasza `api/error.json`. A fogyasztók ebből ellenőrizhetik a saját útvonaltáblájukat.

**Lapozás:** a listák `next_cursor`-ja `common/next-cursor.json`. Ha szöveg, a következő oldalt `?cursor=<next_cursor>`-ral, ugyanazokkal a szűrőkkel kell kérni; ha `null` vagy hiányzik, a lista teljes. A CRUD-listákon a `next_cursor` opcionális: a szerver új sémaverzió nélkül kezdhet lapozni, a kliensnek követnie kell. A pull saját alakot használ (`cursor` + `has_more`).

## Tesztvektorok

Mindkét fogyasztó tesztje közvetlenül a vektorfájlokat olvassa. npm-en a `@waypost/schema/vectors` (`chainVectors`, `scheduleVectors`, `pinVectors`, típusokkal) vagy a JSON-fájlok, Composerrel a `Paths::chainVectors()`, `Paths::scheduleVectors()`, `Paths::pinVectors()`.

- **Lánc:** a `cases` és a `chain` minden elemére `canonical_json` = az `input` RFC 8785 alakja (Waypost-szűkítéssel: csak egész szám, nincs magányos surrogate), `hash` = HMAC-SHA256 a teszt-kulccsal. A `normalized` és az `invalid` nyers JSON-szöveget ad (`entry_json`), amelyet az ellenőrzőnek dekódolnia, a `chain/entry.json`-nal ellenőriznie és kanonizálnia kell. A `normalized` ugyanarra a lenyomatra jut, az `invalid` `invalid`-ra (422) vagy `bad_hmac`-ra. A PHP-recept a `docs/decisions.md`-ben van („A kanonikus JSON pontos szabályai”).
- **Menetrend:** `expansion[]`: menetrend, időzóna, időszak (helyi kezdőnapok) → a körök (`start_day`, `wall_time`, `local`, `utc`). A szabályok a fájl `rules` mezőjében és a `docs/decisions.md`-ben vannak (Q5: a kétszer előforduló időpontnál az első, a nem létezőnél a váltás pillanata).
- **PIN:** PBKDF2-HMAC-SHA256; a `malformed` PIN-eket el kell utasítani.

## Változtatás

**Új séma:**

1. `schemas/<könyvtár>/<név>.json`, `$id`-val, `additionalProperties: false`-szal. A közös típusokra `$ref`-fel kell hivatkozni, nem másolni.
2. Legalább egy érvényes és egy érvénytelen példa: `examples/<könyvtár>/<név>/valid|invalid/*.json`. Az érvénytelen példa egyetlen hibát tartalmazzon, és a fájlneve mondja meg, mi az.
3. `npm run build` (típusok + `lib/generated/`), `npm test`, `npm run validate -- --verbose`: az érvénytelen példák a szándékolt okból buknak-e el.
4. `CHANGELOG.md`, `[Unreleased]`; ha döntés kellett hozzá, `docs/decisions.md`.

**Új végpont:** a kérés-, válasz- és query-séma a fenti lépésekkel, és egy új sor az `endpoints.json`-ban ugyanabban a változtatásban. A `validate.js` elbukik, ha egy `api/` séma egyik végponthoz sem tartozik.

**Kompatibilitás** (részletesen: `CHANGELOG.md` eleje és `docs/decisions.md`, „Kompatibilitás a verziók között”):

- a sorrend mindig séma-kiadás → backend → app;
- kérésoldali bővítést az app csak akkor küldhet, ha a szerver `X-Waypost-Schema` verziója már ismeri;
- válaszoldali bővítés csak opcionális mező vagy olyan enum-érték lehet, amelyre az appnak tartalék ága van;
- sémaútvonal minor verzióban nem nevezhető át;
- törő változás = új major és új `/vN` API.

**Kiadás:** a verzió a `package.json`-ban, a `Paths::VERSION`-ben és a CHANGELOG-ban (`## [X.Y.Z] – <dátum>`), utána `npm run build`, és commit a `main`-re. A `vX.Y.Z` tag csak zöld CI után jöhet; a CI tagre ellenőrzi, hogy a tag és a verzió egyezik. Utána a fogyasztók pinjét kell léptetni.

## Parancsok

Node ≥ 22. A PHP-s ellenőrzésekhez Docker kell, helyi PHP és Composer nem.

| Parancs | Mit csinál |
|---|---|
| `npm install` | Függőségek |
| `npm test` | A szkriptek tesztjei, utána a teljes séma-, példa- és végponttábla-ellenőrzés |
| `npm run validate -- --verbose` | Csak a sémaellenőrzés; az érvénytelen példák elutasításának okával |
| `npm run build` | `types/index.d.ts` és `lib/generated/` újragenerálása (sémaváltozás után kötelező) |
| `npm run vectors:chain`, `vectors:schedule`, `vectors:pin` | A tesztvektorok újragenerálása (kézzel nem szerkesztjük őket) |
| `npm run typecheck` | `tsc` szigorú beállításokkal |
| `sh scripts/composer-smoke.sh` | Composer-telepítés üres projektbe, `Paths` |
| `sh scripts/opis-parity.sh` | Minden példa opis/json-schema-val is |
| `sh scripts/chain-php.sh` | A lánc-vektorok PHP-val (recept + opis) |
| `node scripts/release.js vX.Y.Z` | Kiadhatóság: tag, verziókonstansok, CHANGELOG |

A CI (`.github/workflows/ci.yml`) `main`-pushra, PR-re és `v*` tagre mindezt lefuttatja.

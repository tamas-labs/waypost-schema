# waypost-schema

A Waypost közös szerződése: JSON Schema (draft 2020-12) az API kéréseihez és válaszaihoz, az entitásokhoz és a láncbejegyzésekhez, valamint a lánc, a menetrend és a PIN tesztvektorai. Két csomagként terjed:

- npm: `@waypost/schema` – az app (`../waypost`) használja, `file:../waypost-schema` útvonalról; TS típusok a sémákból.
- Composer: `waypost/schema` – a backend (`../laravel-waypost`) használja, `path` repositoryból; a bemenő JSON ellenőrzése opis/json-schema-val.

## Mérvadó dokumentumok

- Fejlesztői specifikáció: [`../waypost/docs/Waypost – fejlesztői specifikáció (1. lépcső).md`](../waypost/docs/Waypost%20–%20fejlesztői%20specifikáció%20(1.%20lépcső).md) – ez a forrás minden mezőhöz, enumhoz és szabályhoz. Ennek a repónak a fő szakaszai: *Repo és technológiai stack*, *Adatbázis*, *API-szerződés*, *Láncolt napló*, *Állapotgépek / Menetrend → körök*.
- Feladatlista: [`../waypost/docs/tasks.md`](../waypost/docs/tasks.md) – ennek a repónak az M0 mérföldkő, valamint az M4-01, M5-01, M6-01 feladat szól.
- Döntések: [`docs/decisions.md`](docs/decisions.md) – ami a specifikációban nincs eldöntve, ide kerül (dátum, kérdés, döntés, indok). A specifikáció *Nyitott kérdések* (`Q#`) pontjainak döntése is.

## Szerkezet

```text
schemas/
  entities/   # site, user, device, checkpoint, route, route-version, schedule, ...
  api/        # <végpont>.request.json, <végpont>.response.json, <lista>.query.json, error.json
  chain/      # entry.json, payload-<type>.json
endpoints.json               # végponttábla: metódus, útvonal, auth, fejlécek, query-/kérés-/válaszséma
chain/test-vectors.json      # bemenet → canonical_json → hash; nyers szövegek: normalized, invalid
schedule/test-vectors.json   # menetrend + időszak → várt időpontok (DST-vel)
pin/test-vectors.json        # PIN + só + iterációszám → PBKDF2 ellenőrző; hibás alakú PIN-ek
types/index.d.ts             # TS típusok, a sémákból generálva
lib/          # npm-exportok: index.js (sémák, schemaId, SCHEMA_VERSION), vectors.js; generated/ = beágyazott JSON (generált)
src/Paths.php # Composer: Waypost\Schema\Paths – sémák és vektorok útvonala, VERSION
examples/     # <séma útvonala>/valid/*.json, <séma útvonala>/invalid/*.json és <séma útvonala>/expected-errors.json (az érvénytelen példák várt hibája); a Composer-csomagban is (Paths::examplesDirectory())
scripts/      # sémaellenőrzés (Ajv, opis), végponttábla-ellenőrzés, TS típusgenerálás, tesztvektor-generátor, PHP-próbák, kiadásellenőrzés
.github/workflows/ci.yml     # CI: npm test, typecheck, Composer-próba, opis-paritás, lánc-vektorok PHP-val, kiadásellenőrzés
README.md     # fogyasztói útmutató
docs/decisions.md
CHANGELOG.md
```

## Szabályok

- Minden séma JSON Schema **draft 2020-12** (`"$schema": "https://json-schema.org/draft/2020-12/schema"`), `$id` = `https://waypost.dev/schema/v1/<útvonal a schemas/ alatt>` (a `v1` az API főverziója, nem a csomagé); a sémák egymásra relatív `$ref`-fel hivatkoznak. A közös típusok külön sémafájlokban vannak (`schemas/common/`), és `$ref`-fel hivatkozunk rájuk – nem másoljuk őket.
- Minden sémához tartozik legalább egy érvényes **és** egy érvénytelen példa: `examples/<séma útvonala .json nélkül>/valid|invalid/<név>.json`. Az érvénytelen példa fájlneve mondja meg, mi a hiba benne, és egyszerre csak egy hibát tartalmazzon. A várt hibája az `examples/<séma útvonala>/expected-errors.json`-ba kerül: `"<név>": { "path": "/tag_uid", "keyword": "pattern" }` (`required` / `additionalProperties` mellett `"property"`; ha egy hiba két jelzést ad, ezek listája). A `validate.js` elbukik, ha a példa más okból bukik el, vagy nincs bejegyzése, és kiírja a tényleges hibákat.
- Az entitássémák a hálózati alakot írják le: minden mező kötelezően jelen van, a hiányzó érték `null`; csak szerveroldali mező (jelszó, e-mail, eszköztitok, `deleted_at`) nem kerülhet bele.
- Minden objektumséma `additionalProperties: false`; új mező = új minor sémaverzió.
- A `pattern`-ek a JS (Ajv, `u` flag) és a PCRE (opis) közös részhalmazát használják: `[0-9]` a `\d` helyett, nincs lookbehind, nincs Unicode-tulajdonság-osztály, mindig `^…$` horgonnyal.
- A `format` implementációfüggő (az opis és az Ajv eltérhet): mindig `pattern` is álljon mellette, amely egyedül is eldönti az alakot.
- Minden egész mezőnek van `maximum`-a, minden olyan tömbnek `maxItems`-e, amelynek elemszámát nem korlátozza véges értékkészlet.
- **Lebegőpontos szám sehol.** Koordináta `lat_e7` / `lng_e7`, pontosság `accuracy_dm` – egészek.
- Azonosító: UUIDv7. Időbélyeg: ISO 8601, UTC, ezredmásodperccel (`2026-10-27T20:00:00.000Z`). Lenyomat: 64 kisbetűs hex karakter. Base64: szabványos, `=` kitöltéssel, kanonikus (nulla kitöltőbitek); rögzített hosszú bináris értékhez `common/bytes32-base64.json` / `common/bytes16-base64.json`. E-mail: `common/email.json`. Ezek a `schemas/common/` fájljai – új sémában ne írd újra a mintát, hivatkozz rájuk.
- Minden API-válaszban kötelező a `server_time`.
- Minden végpont szerepel az `endpoints.json`-ban (új végpont: a sémáival együtt), és minden `api/` sémát használ egy végpont – ezt a `validate.js` ellenőrzi (`scripts/endpoints.js`). A query paraméterek sémája `api/<lista>.query.json` (szűrő nélkül: `api/list.query`); a lapozott lista `next_cursor`-ja `common/next-cursor.json`.
- A láncbejegyzésben minden mező kötelező, a `null` értékű is. A bejegyzéstípus (`type`) bővíthető legyen (2. lépcső: `sos`), ezért ne zárjuk ki a jövőbeli típusokat az adatmodellben.
- A 2. lépcső funkcióit ne építsd meg, csak ne zárd ki őket.
- A tesztvektorokat generátor állítja elő; a generátor újrafuttatása bájtra azonos fájlt ad. Kézzel nem szerkesztjük.
- A TS típusok (`types/index.d.ts`) és a `lib/generated/` is generáltak, és commitolva vannak (a `file:` függőség symlink, telepítéskor nincs build); sémaváltozás vagy vektor-újragenerálás után `npm run build`. A típusnév a séma útvonalából jön (`scripts/types.js`, `typeNameOf`). A `$ref` melletti `enum` / `const` szűkíti a hivatkozott típust (`Extract<…>`). A feltételes szabályokat a típusok nem tükrözik, kivéve a láncbejegyzés `type` → `payload` ágait; nem típusosítható szerkezetnél (`not`, nem feltételes `allOf`) a generátor hibával leáll.

## Verziózás

- Semver, a `CHANGELOG.md` `[Unreleased]` szakaszába minden változás bekerül.
- Ha az API vagy a lánc formátuma változik, **előbb itt** kell módosítani, új verziószámmal, és csak utána a `laravel-waypost` és a `waypost` kódjában.
- Kompatibilitás (a `CHANGELOG.md` eleje, `docs/decisions.md` „Kompatibilitás a verziók között”): kérésoldali bővítés backend-először (az app a szerver `X-Waypost-Schema` fejléce szerint küldi), válaszoldali bővítés csak opcionális mező vagy tartalék ággal kezelhető enum-érték, sémaútvonal minor verzióban nem nevezhető át.
- Törő változás = új major verzió és új `/vN` API.
- A verziószám a `package.json`-ban és az `src/Paths.php` `VERSION` konstansában van (a kettő egyezését a `scripts/release.test.js` ellenőrzi; npm-en `SCHEMA_VERSION`, a `lib/generated/version.js`-ből). A `composer.json` nem tartalmaz `version` mezőt (`vcs` repositoryból a Composer a git tagből olvassa, `path` repositoryból `dev-main`-t lát).
- Kiadás: verzió a `package.json`-ban, a `Paths::VERSION`-ben és a CHANGELOG-ban (`## [X.Y.Z] – <dátum>`), `npm run build`, commit a `main`-re; tag (`vX.Y.Z`) csak zöld CI után. A CI tagre a `scripts/release.js`-sel ellenőrzi, hogy a tag és a verzió egyezik.

## Nyelv

- A dokumentáció (README, CHANGELOG, decisions, ez a fájl) magyar.
- A kód, az azonosítók, a sémák mezőnevei, a `description` mezők, a commitüzenetek és a kódkommentek angolok.

## Parancsok

- `npm install` – függőségek (Node ≥ 22).
- `npm test` – a szkriptek tesztjei (`node --test`), utána a teljes sémaellenőrzés.
- `npm run validate -- --verbose` – csak a sémaellenőrzés; `--verbose` mellett az érvénytelen példák elutasításának oka is látszik (a szándékolt okot az `expected-errors.json` alapján a sima futás is ellenőrzi). `--root <dir>` másik könyvtárat ellenőriz.
- `npm run vectors:chain` – a `chain/test-vectors.json` újragenerálása (`scripts/chain-vectors.js`). Ha a láncséma vagy a generátor változik, futtasd, és a változást a CHANGELOG-ban jelezd; az `npm test` elbukik, ha a fájl elavult.
- `npm run vectors:schedule` – a `schedule/test-vectors.json` újragenerálása (`scripts/schedule-vectors.js`), a futtató Node tzdata-verziójával (`tzdata` mező; a `--check` a fájlban rögzítettel renderel, eltérésnél figyelmeztet); a kézzel ellenőrzött várt értékek a `scripts/schedule-vectors.test.js`-ben vannak, szabályváltozásnál azokat is frissíteni kell.
- `npm run vectors:pin` – a `pin/test-vectors.json` újragenerálása (`scripts/pin-vectors.js`); az `npm test` elbukik, ha a fájl elavult.
- `npm run types` – a `types/index.d.ts` újragenerálása (`scripts/types.js`); az `npm test` elbukik, ha elavult, vagy ha a típusokkal a `scripts/types-sample.ts` vagy bármelyik érvényes példa nem fordul le.
- `npm run embed` – a `lib/generated/` újragenerálása (`scripts/embed.js`): a verzió, a sémák, a végponttábla és a vektorok ES-modulként. `npm run build` = `types` + `embed`.
- `sh scripts/composer-smoke.sh` – Composer-telepítés üres projektbe `path` repositoryból és a `composer archive` kimenetéből, és a `Paths` ellenőrzése (Docker). Az npm-telepítést az `npm test` próbálja ki (`scripts/package.test.js`).
- `sh scripts/opis-parity.sh` – minden példa opis/json-schema-val is (a backend validátora, Docker); elbukik, ha bármelyiket másképp dönti el, mint az Ajv.
- `sh scripts/chain-php.sh` – a lánc-vektorok PHP-val (a `docs/decisions.md` kanonikus JSON-receptje, a nyers szövegeknél `json_decode` + opis + egyedi `media`-azonosítók is; Docker). Lánc-vektor vagy recept változásakor futtasd.
- `node scripts/release.js vX.Y.Z` – kiadhatóság: a tag = `v<package.json verzió>`, van CHANGELOG-szakasz, a verziókonstansok egyeznek.
- CI: `.github/workflows/ci.yml` – `main`-pushra, PR-re és `v*` tagre: `npm test`, `npm run typecheck`, `composer validate --strict`, `composer-smoke.sh`, `opis-parity.sh`, `chain-php.sh`, tagre `release.js`.
- `npm run typecheck` – `tsc` a `tsconfig.json` szerint (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- `composer validate` – a `composer.json` ellenőrzése. Helyben nincs Composer; Dockerrel: `docker run --rm -v "$PWD":/app -w /app composer:2 validate`.

# waypost-schema

A Waypost közös szerződése: JSON Schema (draft 2020-12) az API kéréseihez és válaszaihoz, az entitásokhoz és a láncbejegyzésekhez, valamint a lánc és a menetrend tesztvektorai. Két csomagként terjed:

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
  api/        # <végpont>.request.json, <végpont>.response.json, error.json
  chain/      # entry.json, payload-<type>.json
chain/test-vectors.json      # bemenet → canonical_json → hash
schedule/test-vectors.json   # menetrend + időszak → várt időpontok (DST-vel)
types/index.d.ts             # TS típusok, a sémákból generálva
examples/     # <séma útvonala>/valid/*.json és <séma útvonala>/invalid/*.json
scripts/      # sémaellenőrzés (Ajv), TS típusgenerálás, tesztvektor-generátor
docs/decisions.md
CHANGELOG.md
```

## Szabályok

- Minden séma JSON Schema **draft 2020-12** (`"$schema": "https://json-schema.org/draft/2020-12/schema"`), `$id` = `https://waypost.dev/schema/<útvonal a schemas/ alatt>`; a sémák egymásra relatív `$ref`-fel hivatkoznak. A közös típusok külön sémafájlokban vannak (`schemas/common/`), és `$ref`-fel hivatkozunk rájuk – nem másoljuk őket.
- Minden sémához tartozik legalább egy érvényes **és** egy érvénytelen példa: `examples/<séma útvonala .json nélkül>/valid|invalid/<név>.json`. Az érvénytelen példa fájlneve mondja meg, mi a hiba benne, és egyszerre csak egy hibát tartalmazzon.
- Az entitássémák a hálózati alakot írják le: minden mező kötelezően jelen van, a hiányzó érték `null`; csak szerveroldali mező (jelszó, e-mail, eszköztitok, `deleted_at`) nem kerülhet bele.
- Minden objektumséma `additionalProperties: false`; új mező = új minor sémaverzió.
- A `pattern`-ek a JS (Ajv, `u` flag) és a PCRE (opis) közös részhalmazát használják: `[0-9]` a `\d` helyett, nincs lookbehind, nincs Unicode-tulajdonság-osztály, mindig `^…$` horgonnyal.
- **Lebegőpontos szám sehol.** Koordináta `lat_e7` / `lng_e7`, pontosság `accuracy_dm` – egészek.
- Azonosító: UUIDv7. Időbélyeg: ISO 8601, UTC, ezredmásodperccel (`2026-10-27T20:00:00.000Z`). Lenyomat: 64 kisbetűs hex karakter. Base64: szabványos, `=` kitöltéssel. Ezek a `schemas/common/` fájljai – új sémában ne írd újra a mintát, hivatkozz rájuk.
- Minden API-válaszban kötelező a `server_time`.
- A láncbejegyzésben minden mező kötelező, a `null` értékű is. A bejegyzéstípus (`type`) bővíthető legyen (2. lépcső: `sos`), ezért ne zárjuk ki a jövőbeli típusokat az adatmodellben.
- A 2. lépcső funkcióit ne építsd meg, csak ne zárd ki őket.
- A tesztvektorokat generátor állítja elő; a generátor újrafuttatása bájtra azonos fájlt ad. Kézzel nem szerkesztjük.
- A TS típusok (`types/index.d.ts`) is generáltak; sémaváltozás után `npm run types`. A típusnév a séma útvonalából jön (`scripts/types.js`, `typeNameOf`). A feltételes szabályokat a típusok nem tükrözik, kivéve a láncbejegyzés `type` → `payload` ágait; nem típusosítható szerkezetnél (`not`, nem feltételes `allOf`) a generátor hibával leáll.

## Verziózás

- Semver, a `CHANGELOG.md` `[Unreleased]` szakaszába minden változás bekerül.
- Ha az API vagy a lánc formátuma változik, **előbb itt** kell módosítani, új verziószámmal, és csak utána a `laravel-waypost` és a `waypost` kódjában.
- Törő változás = új major verzió és új `/vN` API.
- A verziószám a `package.json`-ban van; a `composer.json` nem tartalmaz `version` mezőt (a Composer a git tagből olvassa).

## Nyelv

- A dokumentáció (README, CHANGELOG, decisions, ez a fájl) magyar.
- A kód, az azonosítók, a sémák mezőnevei, a `description` mezők, a commitüzenetek és a kódkommentek angolok.

## Parancsok

- `npm install` – függőségek (Node ≥ 22).
- `npm test` – a szkriptek tesztjei (`node --test`), utána a teljes sémaellenőrzés.
- `npm run validate -- --verbose` – csak a sémaellenőrzés; `--verbose` mellett az érvénytelen példák elutasításának oka is látszik (ellenőrizd, hogy a szándékolt okból buknak-e el). `--root <dir>` másik könyvtárat ellenőriz.
- `npm run vectors:chain` – a `chain/test-vectors.json` újragenerálása (`scripts/chain-vectors.js`). Ha a láncséma vagy a generátor változik, futtasd, és a változást a CHANGELOG-ban jelezd; az `npm test` elbukik, ha a fájl elavult.
- `npm run vectors:schedule` – a `schedule/test-vectors.json` újragenerálása (`scripts/schedule-vectors.js`); a kézzel ellenőrzött várt értékek a `scripts/schedule-vectors.test.js`-ben vannak, szabályváltozásnál azokat is frissíteni kell.
- `npm run types` – a `types/index.d.ts` újragenerálása (`scripts/types.js`); az `npm test` elbukik, ha elavult, vagy ha a típusokkal a `scripts/types-sample.ts` vagy bármelyik érvényes példa nem fordul le.
- `npm run typecheck` – `tsc` a `tsconfig.json` szerint (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- `composer validate` – a `composer.json` ellenőrzése. Helyben nincs Composer; Dockerrel: `docker run --rm -v "$PWD":/app -w /app composer:2 validate`.

# Waypost Schema – specifikációs megfelelőségi mátrix

Audit dátuma: 2026-11-04 · Vizsgált változat: **0.5.0** (`87dc39e`) · Hibajegyzék: [`AUDIT-ISSUES.md`](AUDIT-ISSUES.md) · Jelentés: [`AUDIT-REPORT.md`](AUDIT-REPORT.md)

Forrás: `../waypost/docs/Waypost – fejlesztői specifikáció (1. lépcső).md` (a továbbiakban: *Spec*, sorszámmal), `../waypost/docs/tasks.md` (M0, M4-01, M5-01, M6-01), [`CLAUDE.md`](CLAUDE.md) szabályai.

Státuszok: **PASS** – teljes mértékben megfelel, a működés ellenőrizve; **PARTIAL** – részben teljesül; **FAIL** – nem teljesül; **NOT VERIFIED** – nem volt ellenőrizhető; **NOT APPLICABLE** – nem releváns. PASS csak ott áll, ahol a tényleges tartalmat vagy működést ellenőriztem, nem pusztán a fájl létezését.

## Összesítés

| Státusz | Darab |
|---|---:|
| PASS | 23 |
| PARTIAL | 14 |
| FAIL | 1 |
| NOT VERIFIED | 1 |
| NOT APPLICABLE | 1 |
| **Összesen** | **40** |

## Mátrix

### Sémák és szabványosság

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-01 | JSON Schema Draft 2020-12 (Spec 26) | Minden séma 2020-12, egységes `$id`, feloldható `$ref` | `schemas/**`, `scripts/validate.js:92-105` | PASS | 77/77; Ajv `strict` módban fordul; opis 2.6.0 is feloldja mind. |
| C-02 | Közös típusok `$ref`-fel, nem másolva (CLAUDE.md) | UUID, időbélyeg, lenyomat, base64, koordináta egy helyen | `schemas/common/*` | PASS | A tagek összevetése szerint a korábbi másolatokat is `$ref`-re cserélték (pl. `site.timezone` 0.2.0). |
| C-03 | `additionalProperties: false` minden objektumon (CLAUDE.md) | Ismeretlen mező elutasítva | minden séma | PASS | Gépi bejárással: kivétel csak a szándékos `error.details` térkép és a `chain/entry.payload`, amelyet a típusonkénti ág zár. |
| C-04 | Mintakészlet: JS ∩ PCRE, `^…$` (CLAUDE.md) | Ajv és opis ugyanúgy dönt | minden `pattern` | PASS | Záró sortörés mindkettőben elbukik; 534/534 példa azonos döntés. |
| C-05 | Lebegőpontos szám sehol (CLAUDE.md, Spec 314) | Koordináta, pontosság egész | `common/lat-e7`, `lng-e7`, `accuracy-dm`, `entities/checkpoint` | PASS | A specifikáció `decimal`/`float` oszlopai helyett egészek – dokumentált eltérés (`decisions.md:88-93`). |
| C-06 | Azonosító UUIDv7, időbélyeg ISO 8601 UTC ezredmásodperccel (Spec 99, 103) | Egyetlen szöveges alak | `common/uuid.json`, `common/timestamp.json` | PASS | Kisbetű, verzió- és variánsellenőrzés; `format: date-time` a lehetetlen dátumra (02-30) is. |
| C-07 | Base64: szabványos, kitöltéssel (CLAUDE.md) | Egyetlen alak, pontos bájthossz | `common/base64.json:8`, `user.json:41,55`, `devices-enroll.response.json:26-31` | PARTIAL | A hossz nem rögzíti a bájtszámot (31/33 bájt is átmegy), nem kanonikus kitöltés is érvényes – SCH-012. |

### Entitások

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-08 | Entitássémák (Spec 36, 105-158) | site, user, device, checkpoint, route, route-version(+checkpoint), schedule, report-subscription, media, report | `schemas/entities/` (11) | PASS | Minden mező jelen, hiány = `null`; a mezők a specifikáció táblái szerint. |
| C-09 | Csak szerveroldali mező nem kerül a hálózati alakba (CLAUDE.md, Spec 160) | `email`, `password`, `secret`, `last_seq`, `last_hash`, `deleted_at`, `path`, `recipients` kizárva | `entities/*`, érvénytelen példák (`has-email`, `has-secret`, `with-path`, `with-recipients` …) | PASS | Mindegyikre van elutasított példa. |
| C-10 | Menetrend szabályai (Spec 127-130, 363-369) | `list`/`interval` mód, `weekdays` 1–127, a másik mód mezői `null` | `entities/schedule.json`, `api/schedule-*.request.json` | PARTIAL | A séma helyes; az entitás leírása az `interval_to = interval_from` esetet a döntéssel ellentétben írja le – SCH-017. A „legfeljebb egy visszalépés” szabályt a backend ellenőrzi (dokumentált). |

### API

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-11 | API kérés- és válaszsémák minden végponthoz (Spec 37, 193-203) | `<végpont>.request.json`, `.response.json` | `schemas/api/` (46) | PARTIAL | Minden JSON-törzsnek van sémája, és mind használatban van (backend + app). Hiányzik: query paraméterek (`cursor`, `site_id`, `route_id`, `user_id`, `type`) sémája, és a végpont → séma megfeleltetés gépi alakja – SCH-006. |
| C-12 | `server_time` minden válaszban (Spec 191) | Kötelező mező | minden `api/*.response.json`, `api/error.json` | PASS | Gépileg ellenőrizve; a hibaválaszban is (dokumentált döntés a specifikáció példájával szemben). |
| C-13 | Hibaválasz-séma (Spec 253-260) | `error.code`, `message`, `details`; a specifikáció kódjai | `api/error.json`, `common/error-code.json` | PARTIAL | Alak és kódok rendben (+ `bad_request`, `server_error`, dokumentált). A hibaválasz bejegyzésszintű kódot is elfogad, az üzenet korlátlan – SCH-014; `details` `validation_failed`-nél nem kötelező (dokumentált, SCH-029). |
| C-14 | Pull (Spec 205-224) | kurzor, `has_more`, `changes`, `deleted`, ≤ 500 rekord | `api/sync-pull.response.json` | PASS | Minden lista kötelező; `reset` opcionális bővítés (0.2.0); a specifikáció rövidített példája dokumentáltan érvénytelen példa. |
| C-15 | Push (Spec 226-251) | ≤ 200 bejegyzés, `accepted`, `last_seq`, `rejected`, `media_missing` | `api/sync-push.request.json`, `api/sync-push.response.json` | PASS | `rejected[].expected_seq` a `code`-hoz kötve. A `media_missing` elemszáma korlátlan – SCH-015 (LOW). |
| C-16 | Push-final (Spec 179, 200) | A visszavont eszköz utolsó feltöltése | `api/sync-push-final.*.json` | PASS | Kötegelt változat – dokumentált eltérés a „még egyszer” szövegtől (`decisions.md:352-357`). |
| C-17 | Média feltöltés (Spec 201, 280) | multipart, `sha256` | `api/media-upload.*.json`, `entities/media.json` | PASS | A szöveges mezők sémája; a fájlrész a leírásban. |
| C-18 | Konfigurációs CRUD (Spec 202, M5-01) | `/sites`, `/sites/{id}/users`, `/checkpoints`, `/routes`, `/routes/{id}/versions`, `/schedules`, `/users`, `/report-subscriptions` | `api/*-create`, `*-update`, `*.response`, `*-list.response`, `deleted.response`, `site-user-attach`, `user-pin` | PARTIAL | A törzsek teljesek és mindkét oldalon használtak; a CRUD-listák lapozatlanok és korlátlanok, a lapozás két alakban létezik – SCH-009. |
| C-19 | Jelentésarchívum (Spec 203, M6-01) | `GET /reports?site_id=`, aláírt URL | `api/report-list.response.json`, `entities/report.json` | PARTIAL | Alak rendben; a letöltési URL `http://` is lehet – SCH-020; a letöltő végpont maga nincs a szerződésben – SCH-030. |
| C-20 | `Idempotency-Key` minden író kérésen, 24 órás visszajátszás (Spec 191) | Egyértelmű protokoll | csak `description`-ökben; a szabályok a backend döntésnaplójában | PARTIAL | A fejléc kötelezősége szerepel; a viselkedés (4xx tárolása, `409` + `Retry-After`, a titkok visszajátszása) nincs a szerződésben – SCH-007. |

### Lánc

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-21 | Láncbejegyzések és payloadok (Spec 300-330) | A specifikáció mezői, típusonként saját payload | `chain/entry.json`, `chain/payload-*.json` (6) | PASS | `type` → `payload` feltételes kötés; a payloadok nem keverhetők; `media: [{id, sha256}]` a `media_ids` helyett (dokumentált). Kisebb lazaság: ugyanaz a fotóazonosító két lenyomattal – SCH-016. |
| C-22 | RFC 8785 kanonikus JSON szerződés (Spec 314) | Rögzített, két nyelven reprodukálható szabály | `docs/decisions.md:214-225`, `scripts/jcs.js`, `chain/test-vectors.json` | PARTIAL | A szabály és a pozitív vektorok helyesek (Pythonban függetlenül újraszámolva 13/13); a hibás és normalizálandó bemenet (`1.0`, float, magányos surrogate) közös vektor nélkül, a PHP-recept hiányos – SCH-003. |
| C-23 | HMAC-SHA256-hoz szükséges mezők és formátum (Spec 311) | `hash` = hex(HMAC(secret, canonical(entry \ hash))) | `chain/entry.json` leírás, `common/hash.json`, `api/devices-enroll.response.json` (`secret`) | PASS | A bemenet (a `hash` nélküli bejegyzés) és a kulcs (a dekódolt 32 bájt) egyértelmű; a vektorok `key_base64` és `key_hex` mezője ezt rögzíti. A titok bájthossza nincs pontosan kikényszerítve – SCH-012. |
| C-24 | Null mezők megőrzése (Spec 315) | `null` mező kötelezően jelen | minden láncséma `required` listája; `chain/entry/invalid/missing-null-*.json` | PASS | A séma kikényszeríti; a vektorok `canonical_json`-jában jelen van (`"gnss_time":null`). |
| C-25 | Float értékek kizárása a láncban (Spec 314) | Törtrészes szám elutasítva | `type: integer` minden számon; `scripts/jcs.js:21-22`; backend `CanonicalJson.php:44-51` | PASS | A séma a törtrészes számot elutasítja; az `1.0`-t (matematikailag egész) mindkét implementáció egészként kezeli – ennek közös vektora hiányzik (SCH-003). |
| C-26 | Bővíthető `type` (Spec 519-521) | `sos` később felvehető | `chain/entry.json` zárt enum + ág; `decisions.md:139-144` | PARTIAL | Az út dokumentált és a generátor követi; a régi backend az új típusnál a teljes feltöltést megállítja, a telepítési sorrend nincs a verziózási szabályban – SCH-008. |

### Tesztvektorok

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-27 | Láncteszt-vektorok (Spec 39, 298, M0-07) | bemenet → `canonical_json` → hash, mindkét oldal használja | `chain/test-vectors.json`, `scripts/chain-vectors.js` | PARTIAL | Helyes, determinisztikus, mindkét fogyasztó teszteli. Negatív esetek nincsenek – SCH-003. |
| C-28 | Menetrend-tesztvektorok DST-vel (Spec 40, 448, M0-08) | menetrend + dátum → várt időpontok, mindkét oldal használja | `schedule/test-vectors.json`, `scripts/schedule-vectors.js` | PARTIAL | 16/16 eset, 79 kör függetlenül igazolva; mindkét fogyasztó teszteli. Hónap-, év-, hétváltás és többnapos DST-időszak hiányzik – SCH-004. |
| C-29 | PIN-tesztvektor (Q11) | PIN + só + iteráció → PBKDF2 | `pin/test-vectors.json` | PASS | Függetlenül igazolva; mindkét fogyasztó teszteli. |

### Példák, típusok, csomagolás

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-30 | Érvényes és érvénytelen példa minden sémához (Spec 41, 499) | Mindkét fajta, a valid elfogad, az invalid elutasít, egy hibával | `examples/**`, `scripts/validate.js:157-164` | PASS | 180 + 354 példa; a hiányt a szkript hibának veszi; mind a 354 a megnevezett okból bukik (gépileg ellenőrizve). Az ok ellenőrzése nem automatikus – SCH-021 (LOW). |
| C-31 | TS-típusgenerálás json-schema-to-typescript-tel (Spec 42) | A sémákból generált, fordítható típusok | `scripts/types.js`, `types/index.d.ts` | PARTIAL | Determinisztikus, `tsc --strict` mellett fordul, a 180 példa is. A `$ref` melletti `enum` elveszik (a típus lazább a sémánál) – SCH-005. |
| C-32 | npm-csomag `@waypost/schema` (Spec 26, 33) | Telepíthető, a sémák és típusok elérhetők | `package.json`, `lib/`, `scripts/package.test.js` | PASS | Üres projektbe `file:`-lal telepítve Node-ból és TS-ből (`nodenext`, `bundler`) működik; a tartalom 77 séma + vektorok + típusok. Verziózott terjesztés nincs – lásd C-37. |
| C-33 | Composer-csomag `waypost/schema` (Spec 26, 34) | Telepíthető, a sémák elérhetők, opis-szal validálható | `composer.json`, `src/Paths.php`, `scripts/composer-smoke.sh` | PASS | `composer validate` érvényes; a próba sikeres; opis 2.6.0-val 534/534 példa. A path-telepítés `dev-main` verziója – lásd C-37; az archívum kizárja az `examples/`-t – SCH-011. |

### Verziózás, CI, integráció

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-34 | SemVer, CHANGELOG (Spec 43) | Verzió, tag, changelog összhangban | `package.json:3`, tagek `v0.1.0`–`v0.5.0`, `CHANGELOG.md` | PASS | Egyeznek; a tagek közötti változások mind bővítések (gépi összevetés). |
| C-35 | Törő változás = új major + új `/vN` API (Spec 43) | Kidolgozott út a `/v2`-höz | `CHANGELOG.md:7-9` | PARTIAL | Szabályként rögzítve; a `$id` verzió nélküli, két sémakészlet nem élhet együtt, a „minor” kompatibilitás a telepítési sorrenden múlik – SCH-008. Eddig nem volt törő változás. |
| C-36 | CI-ben validálás (Spec 499) | Minden változás automatikusan ellenőrizve | – | **FAIL** | Nincs CI-konfiguráció – SCH-001. |
| C-37 | Ugyanaz a szerződésverzió mindkét fogyasztónál; reprodukálható telepítés (Spec 70: „Fejlesztés közben … path / file:”) | A fogyasztó egy rögzített verziót kap | `../waypost/package.json:9`, `../laravel-waypost/composer.json:13,24-31`, a lockfájlok | PARTIAL | A specifikáció fejlesztés közben kifejezetten a helyi útvonalat írja elő – ez teljesül. Rögzített verzió nincs: a lockfájlok 0.4.0-t mutatnak, 0.5.0 fut; reprodukálhatatlanság már előfordult (`tasks.md:403`) – SCH-002. |
| C-38 | Mobilapp és backend közös szerződése (Spec 22, 77-78) | A backend a sémákkal validál (opis), az app a generált típusokat használja és `__DEV__`-ben validál (Ajv) | `../laravel-waypost/src/Validation/SchemaValidator.php`, `src/Http/Middleware/ValidateSchema.php`, `routes/api.php`; `../waypost/src/schema/validation.ts`, `src/api/endpoints.ts`, `config-calls.ts` | PASS | Minden kérésséma használt a backendben, minden válaszséma backend-tesztben; az app minden hívást típusoz és validál. Eltérő mezőhasználatot nem találtam. A végpont–séma megfeleltetés kézi (SCH-006). |

### Nem ellenőrizhető / nem releváns

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|
| C-39 | A Composer-csomag dist-archívumból telepítve is működik | Az `archive.exclude` után a backend tesztjei is futnak | `composer.json:14-24` | NOT VERIFIED | Csak `path` repository létezik; dist-archívumot nem állítottam elő. A konfiguráció alapján a backend tesztjei elbuknának – SCH-011. |
| C-40 | A 2. lépcső funkciói (élő követés, SOS, diszpécser, élő riasztás) | Most nem kell megépíteni | – | NOT APPLICABLE | Nincs megépítve, ahogy a specifikáció előírja; a „ne zárja ki” követelményt a C-26 és a C-35 értékeli. |

## Dokumentált eltérések a specifikációtól (nem hibák)

| Specifikáció | Megvalósítás | Döntés |
|---|---|---|
| `checkpoints.lat/lng decimal`, `accuracy_m float` (Spec 117) | `lat_e7`, `lng_e7`, `accuracy_dm` egész | `decisions.md:88-93` |
| A hibaválasz példájában nincs `server_time` (Spec 255-258) | kötelező | `decisions.md:46-51` |
| `media_ids[]` a `scan`/`incident` payloadban (Spec 326-330) | csak `media: [{id, sha256}]` | `decisions.md:132-137` |
| Push-final „még egyszer” (Spec 179) | kötegelt feltöltés, `done: true` zárja | `decisions.md:352-357` |
| `interval_to ≤ interval_from` éjféli ablak (Spec 368) | az egyenlőség érvénytelen | `decisions.md:257` |
| Hibakódlista (Spec 260) | + `bad_request`, `server_error` | `decisions.md:322-327` |
| Diagnosztikai esemény (Spec 281) | láncon kívüli `POST /devices/diagnostics` | `decisions.md:371-376` (Q2) |
| PIN-vektor (nem előírt) | `pin/test-vectors.json` | `decisions.md:311-320` (Q11) |

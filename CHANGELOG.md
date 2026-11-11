# Changelog

A csomag minden lényeges változása ebben a fájlban szerepel.

A formátum a [Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi, a verziózás [Semantic Versioning](https://semver.org/lang/hu/):

- **major**: törő változás (egy eddig érvényes példány érvénytelenné válik, vagy egy mező jelentése megváltozik) – az API-ban új `/vN` előtaggal jár;
- **minor**: visszafelé kompatibilis bővítés (új séma, új opcionális mező, új enum-érték, ahol a fogadó fél ezt elviseli);
- **patch**: javítás, amely nem változtat az érvényes példányok körén (leírás, példa, tesztvektor-pontosítás).

Mivel minden objektumséma `additionalProperties: false`, és a fogadó fél a saját (régebbi) sémájával ellenőriz, egy „minor” bővítés csak akkor kompatibilis, ha a fogadó fél már ismeri. Ezért (részletesen: `docs/decisions.md`, „Kompatibilitás a verziók között”):

- **Sorrend:** séma-kiadás → backend → app. Kérésoldali bővítést (új mező, új enum-érték, új bejegyzéstípus) az app csak akkor küldhet, ha a szerver már ismeri: az `X-Waypost-Schema` fejléc verziója legalább a bővítést hozó verzió.
- **Válaszoldali bővítés:** új mező vagy enum-érték a válaszban. A régi app élesben figyelmen kívül hagyja az ismeretlen mezőt, és az ismeretlen enum-értéket tartalék ágon kezeli (pl. ismeretlen hibakód: a HTTP-státusz szerint); `__DEV__`-ben figyelmeztet.
- **Szigorítás** (új megkötés egy eddig érvényes példányra): csak akkor minor, ha a küldő fél bizonyíthatóan sosem küldött ilyet; egyébként major.
- **Sémaútvonal** (`api/site-create.request` stb.) minor verzióban nem nevezhető át, és nem törölhető: az app outboxa tartósan tárolja.

## [Unreleased]

## [0.9.0] – 2026-11-11

A javításellenőrzés FR-013-as tétele: a telefon azt is jelezheti, ha a szerver a push kötegének első bejegyzését `422 validation_failed`-del utasítja el, és emiatt a lánc feltöltése megáll. Kérésoldali bővítés: a backend előbb frissüljön, az app csak legalább 0.9.0-s szervernek küldi (`docs/decisions.md`, 2026-11-11).

### Added

- `api/device-diagnostic.request.json`: a `code` új értéke `validation_failed`. Ilyenkor az `entry_id` és a `seq` a köteg első, a 422 által megnevezett bejegyzéséé, az `expected_seq` `null`, a `server_last_seq` a telefonnak eddig nyugtázott legnagyobb `seq` (a 422-ben nincs `last_seq`), a `rejected_count` a 422 `details`-ében megnevezett bejegyzések száma, az `occurred_at` a telefon ideje. Új érvényes példa: `validation-failed.json`.

## [0.8.1] – 2026-11-05

Leírások a `laravel-waypost` 2026-11-05-i auditjából (WP-BE-001, WP-BE-003, WP-BE-005): a sémák a backend 0.3.0 működését mondják ki. Az érvényes példányok köre nem változik; a fogyasztóknak nincs teendőjük (`docs/decisions.md`, 2026-11-05).

### Changed

- `common/idempotency-key.json`: az a kulcs, amelyhez az első kérése után 5 percen belül nem tárolódott válasz, elhagyott; a következő próbálkozás újra lefuttatja a kérést (WP-BE-003).
- `api/user-update.request.json`, `api/user-pin.request.json`: a saját e-mail-címet, jelszót és PIN-t a telephelyi telefonon (`X-Acting-User`) csak az módosíthatja, akinek a telefon telephelye az egyetlen telephelye, különben `403` (WP-BE-001).
- `api/user-update.request.json`: az új jelszó a felhasználó összes tokenjét visszavonja, a kérés sajátját kivéve (WP-BE-005).

## [0.8.0] – 2026-11-04

Az audit INFO-tételei (SCH-022 – SCH-029): két szigorítás, a menetrend-vektorok tzdata-verziója, valamint döntések és ismert kockázatok. A `push-final` szigorítását az app nem érinti. A `validation_failed` `details`-e viszont olyan esetet zár ki, amelyet a backend ma küld (nem JSON vagy nem objektum törzs). A backendnek ezért a 0.8.0-ra lépéskor ezt és egy tesztjét igazítania kell (`docs/decisions.md`, SCH-029, SCH-022). 0.x alatt ez minor.

### Changed

- **Szigorúbb hibaválasz:** `validation_failed` esetén a `details` kötelező (eddig csak a leírás mondta); a törzs egészét érintő hiba (nem JSON, nem objektum) az üres kulcs alatt áll. A TS-típus nem változik. A backendnek ezekben az esetekben `details`-t kell adnia (audit: SCH-029).
- **Szigorúbb `push-final`:** `done: false` mellett legalább egy bejegyzés kell; üres köteg csak a lezáró, `done: true` kérésben állhat. Az app ilyet nem küld (audit: SCH-022).
- `endpoints.json`: az `auth.acting` leírása kimondja a bizalmi határt: a szerver a PIN-t nem látja, a tokent birtokló bármelyik telephelyi supervisor nevében küldhet (audit: SCH-024).
- `docs/decisions.md`: ismert kockázatként a PIN-ellenőrző törhetősége (audit: SCH-023) és az `X-Acting-User` bizalmi határa (audit: SCH-024); döntés a lánc formátumának jövőbeli változásáról: új major, a formátum az eszközé (audit: SCH-025).

### Added

- `schedule/test-vectors.json`: `tzdata` mező, a generátor tzdata-verziója (`process.versions.tz`). A `--check` és a teszt a rögzített verzióval renderel, így más tzdata csak eltérő köröknél bukik el, egyébként figyelmeztet (audit: SCH-026).

## [0.7.0] – 2026-11-04

Az audit közepes és alacsony súlyú hibáinak javítása (SCH-003 – SCH-021): végponttábla, lapozás, `Idempotency-Key`, `$id` főverzióval, bővebb lánc- és menetrend-vektorok, szigorúbb sémák, a példák várt hibája. A szigorítások olyan értékeket zárnak ki, amelyeket a backend és az app nem küld (a backend tesztjei a 0.7.0 sémáival is zöldek, egyetlen ismert kivétellel: az új `every-1440` menetrend-vektor a backend kibontásának hibáját mutatja ki); 0.x alatt ezért minor.

### Changed

- **A sémák `$id`-ja főverziót kap:** `https://waypost.dev/schema/v1/<útvonal>` (eddig `https://waypost.dev/schema/<útvonal>`); `SCHEMA_ID_BASE` és `Paths::SCHEMA_ID_BASE` ennek megfelelően. A `v1` az API verziója (`/v1`), nem a csomagé; egy `/v2` készlet saját előtagot kap, így a kettő egy validátorban is megfér (audit: SCH-008). A fájlok helye nem változik. Aki a konstanson vagy a `schemaId()`-n át hivatkozik (mindkét fogyasztó), annak nincs teendője; aki kézzel írta le az `$id`-t, annak igen (0.x alatt nem major, lásd `docs/decisions.md` 2026-10-27).
- `scripts/types.js`: a `$ref` melletti `enum` / `const` szűkíti a hivatkozott típust (`Extract<ErrorCode, "chain_gap" | "chain_fork" | "bad_hmac">`). Eddig elveszett, így a `device-diagnostic.request` `code` és a `sync-push.response` `rejected[].code` típusa mind a 12 hibakódot elfogadta (audit: SCH-005).
- **Szigorúbb base64:** a `common/base64.json` csak kanonikus alakot fogad el (a kitöltés előtti nem használt bitek nullák: `AA==` igen, `AB==` nem). A `secret` és a `pin_hash` `common/bytes32-base64.json`, a `pin_salt` `common/bytes16-base64.json`: pontosan 32, illetve 16 bájt (eddig a hosszkorlát 31–33, illetve 16–18 bájtot engedett) (audit: SCH-012).
- **Szigorúbb diagnosztika:** a `device-diagnostic.request`-ben `chain_gap` ⇔ `expected_seq` egész, egyébként `null`, ahogy a push-válaszban (audit: SCH-013).
- **Szigorúbb hibaválasz:** az `api/error.json` `code`-ja csak a 9 kérésszintű kód (`common/request-error-code.json`; a `chain_gap`, `chain_fork`, `bad_hmac` csak a push `rejected` listájában fordul elő); az `error.message` és a `details` üzenetei legfeljebb 1000 karakteresek (audit: SCH-014).
- **Felső korlátok:** `walk_duration_s` és `walk_time_from_prev_s` ≤ 86 400, a `route-version` `version` ≤ 2³¹−1, a `position` ≤ 500, a `site_ids` és a push-válasz `media_missing` ≤ 1000 elem (a `media_missing`-ből a legrégebbiek, a többi egy későbbi válaszban) (audit: SCH-015).
- **E-mail:** a négy e-mail-mező a közös `common/email.json`-ra hivatkozik: a `format: email` mellett minta (ASCII, legalább kétcímkés domain, domain-literál és idézett helyi rész nélkül), hogy az opis és az Ajv ugyanúgy döntsön (az opis a domain-literált elfogadta) (audit: SCH-018).
- Leírások: az `entities/schedule.json` szerint `interval_to = interval_from` érvénytelen (eddig a leírás `<=`-t írt) (audit: SCH-017); a jelentés letöltési URL-je az API-alap sémáját használja, `http` csak helyi hálózati fejlesztésben (audit: SCH-020); a `media` azonosítói egy bejegyzésen belül egyediek (audit: SCH-016).
- `composer.json`: az `examples/` a Composer-archívumban is benne van (eddig kizártuk, pedig a backend tesztjei olvassák) (audit: SCH-011).
- `docs/decisions.md`: az elavult példa- és körszámok helyett dátumozott állítások, a `Paths` teljes listája (audit: SCH-019).

### Added

- `chain/test-vectors.json`: `normalized` (ugyanannak az aláírt bejegyzésnek másképp leírt nyers JSON-szövegei – egész értékű tört és exponenciális alak, escape-ek, tördelés –, amelyekből ugyanaz a kanonikus JSON és lenyomat jön ki) és `invalid` (nyers szövegek, amelyeket az ellenőrzőnek el kell utasítania: `invalid` = 422, `bad_hmac`) rész; a referencia-ellenőrző a `scripts/chain-vectors.js` `verifyEntryJson()`-ja (audit: SCH-003). A `cases` és a `chain` nem változott.
- `scripts/chain-php.sh`: a lánc-vektorok PHP-val (a `docs/decisions.md` receptje + opis/json-schema), a CI-ben is.
- `schedule/test-vectors.json`: 11 új eset – hónap-, év- és hétváltás, szökőnap, többnapos időszak DST-váltással, `interval_every_min = 1440`, `America/New_York` és az éjfélkor váltó `America/Santiago` (audit: SCH-004). A meglévő esetek nem változtak.
- `CHANGELOG.md`: kompatibilitási szabályok a verziók között (audit: SCH-008).
- `README.md`: a csomag szerepe, telepítés (npm, Composer, pin), validálási recept (Ajv és opis), végponttábla, tesztvektorok, „új séma / új végpont” lépései, kompatibilitási szabályok, parancsok; az npm-csomagban is (audit: SCH-010).
- `endpoints.json`: géppel olvasható végponttábla – mind a 48 végpont metódussal, útvonallal, útvonalparaméterekkel, auth-fajtával, `Idempotency-Key`-igénnyel, query-, kérés- és válaszsémával (státuszonként), a két aláírt URL-es letöltéssel együtt. npm-en `endpoints` (`EndpointTable` típus) és `@waypost/schema/endpoints.json`, Composerrel `Paths::endpoints()`. A `validate.js` ellenőrzi, hogy minden `api/` séma szerepel benne (audit: SCH-006, SCH-030).
- Query-sémák: `api/list.query`, `api/sync-pull.query`, `api/report-list.query`, `api/user-list.query`, `api/checkpoint-list.query`, `api/route-list.query`, `api/schedule-list.query`, `api/report-subscription-list.query`; `common/cursor.json` (a pull `cursor`-ja és a `common/next-cursor.json` erre hivatkozik, az alakjuk nem változott) (audit: SCH-006).
- `common/idempotency-key.json`: az `Idempotency-Key` fejléc alakja és a protokoll leírása (hatókör, 24 órás visszajátszás, tárolt 4xx, `409` + `Retry-After` a még futó kérésre); a kérés-sémák leírása erre hivatkozik, a `conflict` hibakód leírása megemlíti a `Retry-After`-t, a `devices-enroll.response` és a `user.response` leírása a visszajátszást (audit: SCH-007).
- `common/next-cursor.json`: a lapozott listák közös kurzora; a `report-list.response` erre hivatkozik (az alakja nem változott), a hét CRUD-lista (`site-`, `user-`, `checkpoint-`, `route-`, `route-version-`, `schedule-`, `report-subscription-list.response`) opcionális `next_cursor` mezőt kap. Hiányzik vagy `null`: a lista teljes; szöveg: a következő oldalt `?cursor=`-ral kell kérni (audit: SCH-009).
- `chain/test-vectors.json` `invalid`: `duplicate-media-id` – a séma szerint érvényes, helyes lenyomatú bejegyzés, amelyben ugyanaz a fotóazonosító kétszer szerepel; az ellenőrzőnek ezt is el kell utasítania (`scripts/chain-vectors.js` `mediaIdsUnique()`, `scripts/chain-php.sh`) (audit: SCH-016).
- `Paths::examplesDirectory()`: a példák könyvtára; a `scripts/composer-smoke.sh` a `composer archive` kimenetéből is telepít (audit: SCH-011).
- `examples/<séma>/expected-errors.json`: minden érvénytelen példa várt hibája (`path`, `keyword`, `property`); a `validate.js` elbukik, ha egy példa más okból bukik el, vagy nincs bejegyzése (audit: SCH-021).
- Differenciális példák az opis és az Ajv közé: e-mail (`examples/common/email/`), záró sortörésű időbélyeg, szóközös és Unicode gazdájú URL (audit: SCH-018).

## [0.6.0] – 2026-11-04

Visszafelé kompatibilis bővítés: a csomag verziója futásidőben, és a szerződés CI-je (audit: SCH-001, SCH-002).

### Added

- `SCHEMA_VERSION` (npm, `@waypost/schema`) és `Waypost\Schema\Paths::VERSION` (Composer): a csomag verziója futásidőben, hogy a fogyasztó tesztje és a backend `X-Waypost-Schema` fejléce ebből dolgozhasson (`path` repositoryból a Composer csak `dev-main`-t lát).
- CI (`.github/workflows/ci.yml`): `npm test`, `npm run typecheck`, `composer validate --strict`, Composer-telepítési próba, opis-paritás (`scripts/opis-parity.sh`: minden példa opis/json-schema-val is), tagre a kiadás ellenőrzése (`scripts/release.js`: tag = `v<verzió>`, CHANGELOG-szakasz, egyező verziókonstansok).

### Changed

- `docs/decisions.md`: a Composer-verzióról szóló állítás javítva (`path` repositoryból `dev-main`); új döntés a CI-ről, a kiadás menetéről és a fogyasztói verziórögzítésről.
- `composer.json`: a `/.github` kimarad a Composer-archívumból.

## [0.5.0] – 2026-11-04

Visszafelé kompatibilis bővítés: a jelentésarchívum (M6-01).

### Added

- `entities/report`: egy kiküldött vagy előkészített jelentés hálózati alakja (`type`, `period_start`, `period_end`, `generated_at`, `sent_at`), a címzettek e-mail-címei és a tárolási útvonal nélkül; a tárolt fájl (a heti és a havi PDF) aláírt, lejáró URL-je a `download` objektumban (`url`, `expires_at`), különben `null`.
- `api/report-list.response`: `GET /reports` – a hívó telephelyeinek jelentései, a legújabb időszak elöl, oldalanként legfeljebb 100, `next_cursor`-ral lapozva; `?site_id=`, `?type=` szűrés. Csak supervisor token.
- `common/report-frequency`: a jelentés fajtája (`shift`, `daily`, `weekly`, `monthly`).

### Changed

- `entities/report-subscription`, `api/report-subscription-create.request`, `api/report-subscription-update.request`: a `frequency` a `common/report-frequency`-re hivatkozik (ugyanaz a felsorolás; a TS-ben a mező típusa `ReportFrequency`).

## [0.4.0] – 2026-11-02

Visszafelé kompatibilis bővítés: a láncon kívüli diagnosztikai jelzés (Q2, M4-09), és az ismételt létrehozás leírása (M5-02).

### Added

- `api/device-diagnostic.request` és `.response`: `POST /devices/diagnostics`, amellyel az eszköz jelzi, hogy a szerver elutasította egy bejegyzését (`chain_gap`, `chain_fork`, `bad_hmac`). Az azonosítót az app generálja, ugyanaz újra nem változtat semmit.

### Changed

- A létrehozó kérések (`site`, `checkpoint`, `route`, `route-version`, `schedule`, `user`, `report-subscription`) `id` mezőjének leírása: ugyanazzal az azonosítóval megismételt létrehozás (az app outboxa, pl. lejárt `Idempotency-Key` után) nem hoz létre újat. Ha a rekord ugyanazzal a szülővel létezik, és a hívó látja, a válasz `200` a rekord jelenlegi állapotával; a törölt vagy más rekord azonosítója `409 conflict`. A válaszsémák leírásában is (`201; 200 for a repeated id`). Az érvényes példányok köre nem változik.

## [0.3.0] – 2026-11-01

Visszafelé kompatibilis bővítés: a visszavont eszköz utolsó feltöltése, a fotófeltöltés és a `media` entitás (M4-01).

### Added

- `api/sync-push-final.request` és `.response`: a visszavont eszköz utolsó feltöltése, ugyanolyan kötegekben, mint a push; a `done: true` kérés zárja le. A válasz alakja a pushé (`$ref`).
- `api/media-upload.request` (a `PUT /media/{id}` multipart szöveges mezői: `sha256`, `owner_type`, `owner_id`, `taken_at`; a fájl a `file` nevű rész) és `api/media-upload.response`.
- `entities/media`: a fotó hálózati alakja, a szerveroldali `path` nélkül. Egyelőre csak a feltöltés válaszában szerepel, a pullban nem.

### Changed

- `api/checkpoint-create.request`, `api/checkpoint-update.request`: új, opcionális `photo_media_id`.

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

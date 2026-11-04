# Waypost Schema – auditjelentés

Audit dátuma: 2026-11-04 · Vizsgált változat: **0.5.0** (`87dc39e`, tag `v0.5.0`, azonos az `origin/main`-nel) · Szempontrendszer: [`docs/audit.20261104.md`](docs/audit.20261104.md) · Hibajegyzék: [`AUDIT-ISSUES.md`](AUDIT-ISSUES.md) · Megfelelőségi mátrix: [`AUDIT-COMPLIANCE.md`](AUDIT-COMPLIANCE.md)

## 1. Vezetői összefoglaló

A `waypost-schema` **tartalmilag erős, gondosan megtervezett szerződésréteg**. A sémák szabványosak (77/77 draft 2020-12, egységes `$id`, feloldható relatív `$ref`-ek), szigorúak (`additionalProperties: false` mindenhol, ahol objektum van; zárt felsorolások; egész számok a hash-elt adatban), és minden fontos döntés indoklással szerepel a döntésnaplóban. A kriptográfiai és időkezelési tesztvektorokat **függetlenül újraszámoltam**: a 13 lánc-, a 16 menetrend- (79 kör) és a 9 PIN-vektor mind helyes. Mind az 534 példát a backend validátorával (opis/json-schema 2.6.0) is lefuttattam: **egy eltérés sincs** az Ajv-hez képest.

A gyengeségek nem a sémák helyességében, hanem a **kiadási és integrációs folyamatban** vannak:

1. **Nincs CI** (SCH-001, HIGH), pedig a specifikáció előírja; semmi nem akadályozza meg egy hibás szerződés kiadását.
2. **A fogyasztók nem rögzítik a szerződés verzióját** (SCH-002, HIGH): mindkettő szimlinken a szomszédos munkakönyvtárat használja, a lockfájlok 0.4.0-t mutatnak, miközben 0.5.0 fut; a reprodukálhatatlanság már okozott piros buildet.
3. **A verzióeltérés és a `/v2` együttélése nincs megtervezve** (SCH-008, MEDIUM): a szigorú sémák miatt a „minor” bővítés a régebbi fogadónak törő, a lánc pedig egy ismeretlen bejegyzéstípusnál a teljes feltöltést megállíthatja.

Kritikus (integritást vagy adatbiztonságot közvetlenül veszélyeztető) hibát **nem** találtam. Összesen 30 megállapítás: 0 CRITICAL, 2 HIGH, 8 MEDIUM, 11 LOW, 9 INFO.

**Ítélet:** a szerződés két technológiai stack közötti használatra **alkalmas**, a mai működés helyes; a megbízhatósága viszont jelenleg a fejlesztő fegyelmén múlik, nem gépi kényszeren. A HIGH tételek javításáig nem javaslom éles próbaidőszak (M7) indítását.

## 2. Az audit hatóköre és módszertana

**Hatókör:** a `waypost-schema` teljes tartalma (77 séma, 534 példa, 3 vektorfájl, 16 szkript, `lib/`, `types/`, `src/Paths.php`, dokumentáció). A `waypost` és a `laravel-waypost` repóban csak a szerződés használatát vizsgáltam (függőség, validálás, vektorhasználat, végpont–séma megfeleltetés). Mindhárom repó elérhető volt.

**Források:** a fejlesztői specifikáció (`../waypost/docs/Waypost – fejlesztői specifikáció (1. lépcső).md`), `../waypost/docs/tasks.md`, a három repó `docs/decisions.md`-je.

**Futtatott ellenőrzések** (egyik sem módosított repót; ideiglenes fájlok csak a munkamenet scratchpad-jében):

| Ellenőrzés | Eszköz | Eredmény |
|---|---|---|
| `npm test` (szkripttesztek + teljes sémaellenőrzés) | Node 22.22.0, npm 10.9.4 | 57/57 teszt zöld; 77 séma, 180 érvényes, 354 érvénytelen példa |
| Az érvénytelen példák elutasításának oka | saját Ajv-szkript, minden hibaág kigyűjtve | mind a 354 a fájlnévben megnevezett okból bukik |
| Lánc-vektorok független újraszámolása | Python 3.10, saját JCS + `hmac`/`hashlib` | 13/13 `canonical_json` és `hash` egyezik; a lánc `prev_hash`-ei helyesek |
| Menetrend-vektorok független újraszámolása | Python `zoneinfo`, a Q5-szabály saját implementációja | 16/16 eset, 79 kör egyezik; az időkeret-alapérték 12/12 |
| PIN-vektorok független újraszámolása | Python `hashlib.pbkdf2_hmac` | 7 egyező, 2 nem egyező, 10 hibás alakú – mind helyes |
| Ajv ↔ opis paritás | opis/json-schema 2.6.0, PHP 8.4.27 (a backend vendorjából, Dockerben, csak olvasható csatolással) | 534/534 példa azonos döntés |
| Ajv ↔ opis differenciális próba | 25 kézzel írt határeset | 1 eltérés (`a@[127.0.0.1]`) – SCH-018 |
| Túl megengedő esetek próbája | Ajv | lásd SCH-012 – SCH-016, SCH-022, SCH-029 |
| Bejárás korlát nélküli mezőkre | saját szkript minden sémán | SCH-015 |
| Verziótörténet (`v0.1.0` → `v0.5.0`) | leírás nélküli sémák összevetése tagenként | csak bővítések, rejtett törő változás nincs |
| `composer validate` | `composer:2` image | érvényes |
| `scripts/composer-smoke.sh` | Docker | sikeres, de a verzió `dev-main` (SCH-002) |
| `npm pack --dry-run` | npm | 91 fájl, 77 séma, 3 vektorfájl, `lib/`, `types/` |
| Távoli tagek | `git ls-remote` | `v0.1.0` – `v0.5.0` fent van, a `main` azonos |

**Nem ellenőriztem:** a Composer-csomag dist-archívumból való telepítését (csak `path` + szimlink létezik, SCH-011); a backend és az app teljes tesztkészletének futását (nem volt feladat); éles HTTP-forgalmat; azt, hogy a két alkalmazás minden kódútja valóban sémaérvényes adatot küld – ezt a backend sématesztjei és az app `__DEV__`-ellenőrzése fedi, amelyeket csak forrásszinten néztem meg.

## 3. Vizsgált repository-struktúra

```text
schemas/common/    13 közös típus (uuid, timestamp, hash, base64, lat-e7, lng-e7, accuracy-dm, error-code, …)
schemas/entities/  11 entitás (site, user, device, checkpoint, route, route-version, route-version-checkpoint,
                   schedule, report-subscription, media, report)
schemas/chain/      7 (entry + 6 payload)
schemas/api/       46 (19 kérés, 26 válasz, error)
examples/          534 példa (180 érvényes, 354 érvénytelen), sémánként legalább 1+1
chain/ schedule/ pin/   test-vectors.json (generált)
types/index.d.ts   generált TS-típusok (1507 sor)
lib/               npm-exportok + lib/generated/ (generált ES-modulok)
src/Paths.php      Composer-segédosztály
scripts/           validate, types, embed, 3 vektorgenerátor + JCS, 7 tesztfájl, composer-smoke.sh
docs/decisions.md  30+ döntés
```

Eltérés a specifikáció szerinti szerkezettől: van `schemas/common/` (a közös definíciók külön fájlokban, hogy példát kaphassanak – indokolt, `decisions.md:21-26`), `pin/` (Q11), `lib/`, `types/`, `src/` (csomagolás). Mindegyik funkcionálisan indokolt és dokumentált. **Hiányzik:** `README.md` (SCH-010) és CI-konfiguráció (SCH-001).

Árva, duplikált vagy elavult fájlt nem találtam: minden példa sémához tartozik (ezt a `validate.js` ki is kényszeríti), minden generált fájl forrása egyértelmű (fejléccomment + bájtazonossági teszt).

## 4. Általános architekturális értékelés

**A repó valóban központi szerződésrétegként működik.** Mindkét fogyasztó innen veszi a sémákat (a backend `ValidateSchema` middleware-rel minden JSON-kérést, a `media-upload`-ot a kontrollerben ellenőriz; az app minden kérést és választ `__DEV__`-ben), és mindkettő a közös vektorokkal teszteli a lánc-, a menetrend- és a PIN-implementációját.

**Erős döntések:** egyetlen hálózati alak entitásonként (pull és CRUD ugyanazt adja, `decisions.md:81-86`); a hash-elt adatból kizárt lebegőpontos szám; a szigorú szöveges alakok (kisbetűs UUIDv7, ezredmásodperces `Z` időbélyeg) a hash-stabilitásért; a `type` → `payload` feltételes kötés, amelyből diszkriminált TS-unió lesz.

**Ahol az üzleti logika kiszivárgott a szerződésből** (a fogyasztók valamelyike tartja nyilván, a közös rétegben nincs gépi alakja): az idempotencia-protokoll (SCH-007), a végpont–séma megfeleltetés és a query paraméterek (SCH-006), a verzióegyeztetés (SCH-002, SCH-008). Ezek mind olyan megállapodások, amelyek ma a backend döntésnaplójában vagy kódjában élnek.

## 5. JSON Schema minőség

**Szabványosság:** mind a 77 séma `$schema` = draft 2020-12, `$id` = `https://waypost.dev/schema/<útvonal>` (a `validate.js` kikényszeríti). Az Ajv `strict` módban fordít (elgépelt kulcsszó hiba). Körkörös hivatkozás nincs; minden `$ref` feloldódik (Ajv és opis is). A `$ref` melletti testvérkulcsszavak (2020-12-ben szabályosak) helyesen működnek a validátorokban, de a TS-generátor egy részüket eldobja (SCH-005).

**Mintakészlet:** a `pattern`-ek valóban a JS/PCRE közös részhalmazát használják; a záró sortörés (PCRE `$`) csapdáját az opis kezeli – próbáltam: `…\n` minden mintán elbukik mindkét validátorban.

**Típusok és korlátok:** a stringek kevés kivétellel (SCH-014) hosszkorlátosak, a koordináták és a pontosság 32 bites tartományban vannak, a láncbeli egészek ±(2⁵³ − 1)-en belül. Kivételek: néhány felső korlát nélküli egész és tömb (SCH-015), a base64-hosszak, amelyek nem rögzítik a bájthosszt (SCH-012).

**Null-kezelés:** következetes. Entitásban és láncban minden mező kötelező, a hiány `null`; kérésben a hiány „változatlan”/„alapérték”, a `null` törlés – ez dokumentált és következetesen alkalmazott (`decisions.md:336`). Egyetlen opcionális válaszmező van (`sync-pull.response.reset`), szándékosan, a visszafelé kompatibilitásért.

**Entitások:** az azonosítók, időbélyegek és hivatkozások egységesek (`*_id` mind `common/uuid`, `*_at` mind `common/timestamp`). A szerveroldali mezők (`email`, `password`, `secret`, `last_seq`, `last_hash`, `deleted_at`, `path`, `recipients`) sehol nem szerepelnek, és mindegyikre van érvénytelen példa. Ugyanaz a fogalom mindenhol ugyanazzal a névvel és típussal szerepel (`lat_e7`/`lng_e7`/`accuracy_dm` a pontban és a láncban; `frequency` és `report.type` közös felsorolás 0.5.0 óta). Egy belső ellentmondás van: a `schedule` entitás leírása a `interval_to = interval_from` esetet éjféli ablaknak mondja, a többi forrás érvénytelennek (SCH-017).

**Túl megengedő esetek** (mind kipróbálva): 31/33 bájtos titok (SCH-012), a diagnosztika `expected_seq`-je (SCH-013), bejegyzésszintű kód a hibaválaszban (SCH-014), `1e300` mint pozíció (SCH-015), ugyanaz a fotó két lenyomattal (SCH-016). **Túl szigorú esetet** – a specifikáció által megengedett, de elutasított adatot – nem találtam; a szigorítások (pl. csak `image/jpeg`, kisbetűs UUID) dokumentált döntések.

## 6. API-szerződések minősége

**Végpont – kérés – válasz megfeleltetés** (forrás: `../laravel-waypost/routes/api.php`, `../waypost/src/api/endpoints.ts`, `config-calls.ts`; „B” = a backend a kérést a sémával validálja / a választ tesztben a sémához méri; „A” = az app `__DEV__`-ben validál):

| Végpont | Kérésséma | Válaszséma | Backend | App |
|---|---|---|---|---|
| `POST /auth/login` | `auth-login.request` | `auth-login.response` | B / B | A / A |
| `POST /auth/logout` | – (nincs törzs) | `auth-logout.response` | – / B | – / A |
| `POST /devices/enroll` | `devices-enroll.request` | `devices-enroll.response` | B / B | A / A |
| `POST /devices/diagnostics` | `device-diagnostic.request` | `device-diagnostic.response` | B / B | A / A |
| `GET /sync/pull?cursor=` | **nincs query-séma** | `sync-pull.response` | – / B | – / A |
| `POST /sync/push` | `sync-push.request` | `sync-push.response` | B / B | A / A |
| `POST /sync/push-final` | `sync-push-final.request` | `sync-push-final.response` | B / B | A / A |
| `PUT /media/{id}` (multipart) | `media-upload.request` | `media-upload.response` | B (kontrollerben) / B | A / A |
| `GET /sites` | – | `site-list.response` | – / B | – / A |
| `POST /sites`, `PATCH /sites/{id}`, `GET /sites/{id}` | `site-create`, `site-update` | `site.response` | B / B | A / A |
| `GET /sites/{id}/users`, `POST`, `DELETE …/users/{user}` | `site-user-attach` | `user-list`, `user.response`, `deleted.response` | B / B | A / A |
| `/users` (GET, POST, GET/PATCH `{id}`, PUT `{id}/pin`, DELETE) | `user-create`, `user-update`, `user-pin` | `user-list`, `user.response`, `deleted.response` | B / B | A / A |
| `/checkpoints` (CRUD) | `checkpoint-create`, `checkpoint-update` | `checkpoint-list`, `checkpoint.response`, `deleted.response` | B / B | A / A |
| `/routes` (CRUD) | `route-create`, `route-update` | `route-list`, `route.response`, `deleted.response` | B / B | A / A |
| `/routes/{id}/versions` (GET, POST, GET `{version}`) | `route-version-create` | `route-version-list`, `route-version.response` | B / B | A / A |
| `/schedules` (CRUD) | `schedule-create`, `schedule-update` | `schedule-list`, `schedule.response`, `deleted.response` | B / B | A / A |
| `/report-subscriptions` (CRUD) | `report-subscription-create`, `-update` | `report-subscription-list`, `report-subscription.response`, `deleted.response` | B / B | A / A |
| `GET /reports?site_id=&type=&cursor=` | **nincs query-séma** | `report-list.response` | – / B | (az app nem hívja) |
| `GET /media/{id}/file`, `GET /reports/{id}/file` | – (bináris) | – | **nincs a szerződésben** (SCH-030) | – |

A listavégpontokat (`GET /sites` kivételével) az app nem hívja, a pull adatából dolgozik – ez a specifikációval összhangban van. Minden kérésséma használatban van a backendben, minden válaszsémát legalább egy backend-teszt a sémához mér (25 különböző `toMatchSchema` hívás). **A két oldal ma ugyanazt a szerződést valósítja meg**; a megfeleltetés azonban kézzel, három helyen van nyilvántartva (SCH-006).

**Egységesség:** a sikeres válasz mindig `{ server_time, <név>: … }`, a hiba mindig `api/error.json` – ez kiváló. Minden válaszséma kötelezővé teszi a `server_time`-ot (gépileg ellenőrizve). Gyengeség: a lapozás két alakban létezik, a CRUD-listák lapozatlanok (SCH-009); a `409` két jelentése (ütközés / még futó kérés) nem különül el a törzsben (SCH-007); a hibaválasz kódkészlete tágabb a szükségesnél (SCH-014).

**Kétértelmű vagy csak a kódból érthető viselkedés:** a fejlécek (`Authorization`, `Idempotency-Key`, `X-Acting-User`) és a query paraméterek csak `description`-ben; az ismételt létrehozás (`200` a `201` helyett) jól leírt; a `PATCH` `null` = törlés szabálya következetes.

## 7. Láncformátum és tesztvektorok értékelése

**Mit garantál a séma** (`chain/entry.json`, `payload-*.json`): minden mező jelen van (a `null` is); egész számok ±(2⁵³ − 1)-en belül, lebegőpontos szám (törtrésszel) nincs; a `type` zárt felsorolás, és mindegyikhez pontosan egy payloadséma tartozik (ezt a TS-generátor is ellenőrzi); a `seq = 1` ⇒ `prev_hash` = 64 nulla; a szinkronreferencia mindent-vagy-semmit; a `scan` belső szabályai (módszer ⇔ címkeadat, `unknown_tag` ⇔ `checkpoint_id = null`, `mock_location` ⇔ `is_mock`, kézi rögzítésnél jegyzet + fotó + jelölés); a szerveroldali jelölések és mezők nem kerülhetnek a bejegyzésbe. A payloadok **nem keverhetők össze**: egy `scan` típusú bejegyzés `round_closed` payloadja sémahibás (példa: `examples/chain/entry/invalid/payload-of-other-type.json`).

**Amit a kódnak kell garantálnia** (a séma nem tudja): a kanonizálás (kulcsrendezés, escape), a `1.0` → `1` normalizálás vagy elutasítás, a HMAC, a `seq`-folytonosság és a `prev_hash`-lánc, a `push` `device_id`-jének egyezése a tokennel és a bejegyzésekkel, a fotóazonosítók egyedisége (SCH-016). A backend `CanonicalJson.php` ezeket helyesen kezeli (floatot egészre normalizál vagy elutasít, a nyers törzset olvassa a Laravel `TrimStrings` middleware-je előtt), és a titkot base64-dekódolva használja kulcsként – összhangban a vektorok `key_base64`/`key_hex` mezőivel.

**Amit a vektoroknak kell bizonyítaniuk:** a 13 vektor lefedi mind a 6 típust, a `null` mezőket, az ékezetes és a nem-BMP Unicode-ot, a `/` és U+2028 betű szerinti kiírását (ezen törne el az alapértelmezett PHP `json_encode`), a vezérlőkarakter-escape-et, a 2⁵³ − 1-et, a fordított kulcssorrendet minden szinten és egy 3 elemű láncot. **Függetlenül újraszámolva mind helyes.** A JS-referencia a `canonicalize` csomaggal (az RFC társszerzőjétől) is egyezik. Hiányzik: hibás bemenetek és normalizálási esetek közös vektorai (SCH-003); `\b`, `\f`, U+0000 a vektorokban (a JS-teszt fedi, a közös fájl nem).

**PHP és TS ugyanazt adja-e?** A mai implementációkkal igen: mindkét fogyasztó a közös vektorokkal tesztel (`../waypost/src/chain/hmac.test.ts`, `payloads.test.ts`; `../laravel-waypost/tests/Unit/Chain/CanonicalJsonTest.php`). A határesetek egyezése viszont nincs közösen rögzítve.

## 8. Menetrend-tesztvektorok értékelése

A 16 eset (79 kör) a Q5 döntés szerint helyes; Python `zoneinfo`-val, a generátortól független implementációval mind egyezik. **Lefedett:** hétköznapi lista és intervallum, 20:00–08:00 = 13 kör, lépésre nem eső vég, a `weekdays` kezdőnapra vonatkozása (péntek éjjel → szombat reggel; a szombati időszakba nem kerül át), mindkét 2026-os DST-éjszaka (12 és 13 kör), a nem létező 02:30 → 03:00, a kétszer előforduló 02:30 → első előfordulás, az egy pillanatra eső körök összevonása, UTC-zóna, az időkeret-alapérték szélei.

**Nem lefedett** (SCH-004): hónap- és évváltás, szökőnap, vasárnap → hétfő átnyúlás, DST-t tartalmazó többnapos időszak, `interval_every_min = 1440`, nem európai DST-zóna. A specifikáció a hétfő 20:00 – kedd 08:00 = hétfő szabályt rögzíti – ezt a vektorok (péntek–szombat, kedd–szerda) helyesen modellezik.

**Specifikációs eltérések, döntéssel:** az `interval_to = interval_from` a specifikáció (`≤`) szerint éjféli ablak volna, a döntés szerint érvénytelen (`decisions.md:257`); a `list` mód éjféli átnyúlását a specifikáció nem szabályozza, a döntés kitölti a hiányt (`decisions.md:252-261`). Ezek döntést igénylő specifikációs hiányok voltak, és döntés született róluk – nem hibák. A tzdata verziója nincs rögzítve (SCH-026).

## 9. TypeScript-típusgenerálás értékelése

A `json-schema-to-typescript` (v16) használata a specifikáció szerinti, egy előfeldolgozó lépéssel (`scripts/types.js`), amely a fájlok közötti `$ref`-et nevesített típusra fordítja – így egy típus egyszer szerepel (nincs `Timestamp1`, `Timestamp2`). A generátor **determinisztikus** (bájtazonossági teszt), a nem típusosítható szerkezetnél (`not`, nem feltételes `allOf`) hibával leáll, a névütközést ellenőrzi. A `ChainEntry` diszkriminált unió a `type` → `payload` ágakból jön, és a generátor leáll, ha az enum és az ágak eltérnek.

A null-ábrázolás (`T | null`, kötelező kulcs) és az opcionális mezők (`?:`, `exactOptionalPropertyTypes`) pontosan követik a sémát; a `minItems: 1` nem üres tuple. Ellenőrzés: TypeScript 7, `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`; mind a 180 érvényes példa lefordul a saját típusával (a típus nem szigorúbb a sémánál), a `types-sample.ts` `@ts-expect-error` sorai a fő hibafajtákat lefedik.

**Hiba:** a `$ref` melletti `enum` elveszik, a típus lazább a sémánál (SCH-005). A típusok – helyesen – nem futásidejű ellenőrzések: a minták, tartományok és feltételes szabályok csak a sémavalidációban élnek, ezt a fájl fejléce ki is mondja.

## 10. PHP / Composer kompatibilitás

A `composer.json` érvényes (`composer validate`), a csomagnév `waypost/schema`, PHP `^8.4` (egyezik a backenddel), PSR-4 `Waypost\Schema\` → `src/`. A `Paths` osztály a sémák könyvtárát, egyenkénti útvonalát, `$id`-ját, a nevek listáját és a három vektorfájlt adja; a névformátumot ellenőrzi (útvonal-bejárás ellen). A backend az ajánlott módon használja: `registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/')`.

**opis-kompatibilitás:** a backendben ténylegesen telepített opis/json-schema **2.6.0**-val mind az 534 példa ugyanúgy dönt, mint az Ajv; a használt konstrukciók (`if/then/else`, `contains`, `not`, `false` séma, `minProperties`, `uniqueItems` objektumokon, `format: date-time | email | uri`, `$defs`) mind működnek. Egy `format: email` határeset eltér (SCH-018). A paritást a repó semmilyen automatizmussal nem ellenőrzi.

A Composer path-telepítés `dev-main` verziót ad, a backend kézzel írja felül (SCH-002). A dist-archívumból kimaradó `examples/`-re a backend tesztjei építenek (SCH-011).

## 11. npm / Composer csomagolás

| | npm (`@waypost/schema`) | Composer (`waypost/schema`) |
|---|---|---|
| Sémák | 77 (`schemas/`) | 77 (`schemas/`) |
| Vektorok | `chain/`, `schedule/`, `pin/` + beágyazott ES-modulok | `chain/`, `schedule/`, `pin/` |
| Típusok, JS | `lib/`, `types/` | kizárva (helyesen) |
| Példák | nincs | path-módban van, archívumban kizárva |
| Verzió | `package.json` 0.5.0 | git tagből – path-módban `dev-main` |
| Terjesztés | `private: true`, csak `file:` | csak `path` repository |

A két csomag **ugyanazt a sémakészletet** tartalmazza (ugyanabból a könyvtárból), eltérő sémakészlet a két telepítési módból nem keletkezhet. A `lib/generated/` a JSON-ok bájtazonos beágyazása (teszt ellenőrzi), mert a Metro nem tud JSON-t import-attribútummal betölteni – jól indokolt. Az exportok zártak (`scripts/` nem importálható, teszt ellenőrzi). **A publikálás nem reprodukálható és nem verziózott** (SCH-002): a fogyasztók azt kapják, ami a szomszéd könyvtárban éppen van.

## 12. Verziókezelés és visszafelé kompatibilitás

A `package.json` verziója, a tagek (`v0.1.0` – `v0.5.0`, mind a távoli repóban is) és a CHANGELOG szakaszai egyeznek. A CHANGELOG Keep a Changelog formátumú, és minden kiadásnál pontosan felsorolja a változást. A tagek közötti sémák leírás nélküli összevetése szerint **minden kiadás csak bővítés** volt (új sémák, új enum-értékek, új opcionális mezők, egy `$ref`-re cserélt azonos minta) – rejtett törő változást nem találtam.

**Kompatibilitási hatás változásfajtánként** (a mai sémák és a fogyasztók viselkedése alapján):

| Változás | Régi app ↔ új backend | Új app ↔ régi backend |
|---|---|---|
| Új mező a **válaszban** | a régi app `__DEV__`-ben sémahibát ad (`additionalProperties: false`), élesben figyelmen kívül hagyja; TS-ben nem látja | – |
| Új opcionális mező a **kérésben** | kompatibilis | a régi backend **422** (`additionalProperties: false`) |
| Új enum-érték a válaszban (pl. hibakód) | `__DEV__`-ben sémahiba; a kimerítő `switch` fordítási hibát ad frissítéskor | – |
| Új bejegyzéstípus (`sos`) | – | a régi backend a teljes köteget 422-vel utasítja el; a lánc nem ugorhat, a feltöltés megáll |
| Mező opcionálissá tétele (válasz) | törő: a régi app kötelezőnek veszi | – |
| Mező törlése / típusváltás | törő mindkét irányban | törő |

Következmény: a „minor” csak **szerver-először** telepítéssel kompatibilis, ezt sem a CHANGELOG szabálya, sem futásidejű jelzés nem biztosítja (SCH-008, SCH-002). A `$id`-ban nincs főverzió, így a `/v1` és a `/v2` sémakészlet ugyanabban a validátorban nem élhet együtt (SCH-008).

## 13. Mobilalkalmazás és backend szerződésének egyezősége

- **Típusok:** az app a generált típusokat importálja (`@waypost/schema`) minden végponthíváshoz; a konfigurációs hívások típusosak (`config-calls.ts`).
- **Sémák:** a backend minden JSON-kérést a megfelelő sémával validál (`ValidateSchema` middleware, a `media-upload` a kontrollerben), és minden válaszsémát tesztel; az app ugyanazokkal az Ajv-beállításokkal validál, mint a séma repó (`strict`, `strictRequired: false`, `ajv-formats`).
- **Vektorok:** a lánc- és a menetrend-vektorokat mindkét oldal teljesen bejárja (`hmac.test.ts`, `payloads.test.ts`, `schedule.test.ts`; `CanonicalJsonTest.php`, `ExpansionTest.php`, `TimeLimitTest.php`); a PIN-vektorokat is (`pin.test.ts`, `PinHasherTest.php`).
- **Lánc:** a HMAC kulcsa mindkét oldalon a base64-dekódolt 32 bájt; a backend a nyers törzsből számol.
- **Eltérésforrások:** a szerződés verziója nincs rögzítve (SCH-002); az idempotencia (SCH-007) és a végpont–séma megfeleltetés (SCH-006) két helyen, kézzel él; az app outboxa sémaútvonalakat tárol (SCH-028).

Forrásszinten a két alkalmazás **ugyanazt a szerződést valósítja meg**; ellentmondó mezőhasználatot, nem létező mezőre támaszkodást vagy eltérő enum-értéket nem találtam.

## 14. Biztonsági értékelés

**Jó:** `additionalProperties: false` mindenhol (a kiszivárgó titkot vagy a kliens által becsempészett szerveroldali mezőt – `created_by`, `version`, `position`, `pin_hash`, `secret`, `mime` – érvénytelen példák bizonyítják); a kötegek korlátosak (push 1–200 bejegyzés, pull listánként ≤ 500, jegyzet ≤ 2000, NDEF ≤ 8192); a szülő (`site_id`, `route_id`) és a szerep a módosító kérésben nem változtatható; az e-mail, jelszó, titok soha nem kerül pull-válaszba; a titok és a token csak a hozzárendelés válaszában van.

**Gyengeségek:** néhány korlát nélküli egész és tömb (SCH-015), `http://` letöltési URL (SCH-020), a base64-hossz pontatlansága (SCH-012). Specifikációs szintű kockázatok, amelyeket a séma nem okoz, de a szerződés nem tesz láthatóvá: a 6 jegyű PIN ellenőrzője kinyerés után gyorsan törhető (SCH-023); az `X-Acting-User` a telefon tokenjének birtokosára bízza a supervisor jelenlétét (SCH-024). A hitelesítés és a jogosultság nem a séma feladata; a leírások a határokat (ki hívhat, mikor `403`) érthetően rögzítik.

## 15. Tesztelés és CI

A helyi tesztkészlet **kiemelkedően jó**: a sémák fordulása, az `$id`-k, minden példa (és mindkét fajta példa megléte), a generált fájlok bájtazonossága (`types/`, `lib/generated/`, 3 vektorfájl), a generátorok determinizmusa, a vektorok független újraszámolása (JCS a `canonicalize` csomaggal, PBKDF2 WebCryptóval és az RFC 7914 vektorával, a menetrend kézi várt értékekkel), az npm-telepítés üres projektbe (Node, TS `nodenext` és `bundler`), a típusok fordítása az összes érvényes példával. A `validate.js` saját tesztjei a hibás hivatkozást, a hiányzó sémát, a rossz `$id`-t és a rossz helyen lévő fájlt is lefedik.

**Hiányzik:** CI (SCH-001); opis-paritás teszt (SCH-018); a Composer-próba és a `composer validate` az `npm test`-ből; az érvénytelen példák szándékolt okának gépi ellenőrzése (SCH-021); negatív lánc- és bővebb menetrend-vektorok (SCH-003, SCH-004). **A CI hiánya miatt jelenleg semmi nem akadályozza meg egy hibás vagy inkompatibilis séma kiadását.**

## 16. Dokumentáció

A `docs/decisions.md` kiváló: minden nem triviális döntés kérdés–döntés–indok formában, hivatkozásokkal; a `CHANGELOG.md` pontos; a sémák `description`-jei részletesek és a TS-be is átkerülnek; a `CLAUDE.md` tömören rögzíti a szabályokat és a parancsokat. **Hiányzik a README** (SCH-010), és néhány döntés elavult számot vagy állítást tartalmaz (SCH-019).

Egy új fejlesztő a meglévő anyagból **meg tudja érteni** a repó szerepét, **tud** új sémát létrehozni (CLAUDE.md szabályai + a `validate.js` hibaüzenetei), típust generálni és tesztet futtatni. **Nehezen tudja** a csomagot a két ökoszisztémában helyesen bekötni (a recept a döntésnapló mélyén van), új végpontot felvenni (nincs végponttábla, SCH-006), és kompatibilis változtatást tervezni (a telepítési sorrend nincs kimondva, SCH-008).

## 17. Clean Code és karbantarthatóság

A szkriptek kicsik, egyfelelősségűek, egységes szerkezetűek (`render…()` + `--check` + `main`), egymásra minimálisan függnek (`validate.js` → `createAjv`, `types.js` → `schemaPaths`), a mellékhatás csak a `main`-ben van, így tesztelhetők. A hibaüzenetek pontosak és a javítás parancsát is megmondják („run: npm run types”). Determinisztikus működés: óra és véletlen nincs a generátorokban (a menetrend-generátor a futtató ICU-jától függ, SCH-026). A DRY elv érvényesül a közös sémákban; a CRUD-kérésekben a mezőleírások (pl. az `id` hosszú leírása) ismétlődnek – ez a TS-dokumentáció miatt elfogadható. Felesleges absztrakciót nem találtam. A `Paths` egyszintű `glob`-ja (SCH-027) és a `types.js` `$ref`-kezelése (SCH-005) a két pont, ahol a bővítés csendben hibát okozhat.

## 18. Második lépcsőre való felkészültség

- **SOS (`sos` bejegyzéstípus):** az út ki van jelölve (új enum + payload + ág, minor; a DB-ben szöveges oszlop, Q14), és a TS-generátor automatikusan követi. Kockázat: a régi backend a teljes láncfeltöltést megállítja (SCH-008) – a backendnek mindig előbb kell frissülnie.
- **Élő követés:** a specifikáció szerint külön tábla és végpont, nem a lánc – semmi nem zárja ki.
- **Élő riasztások, `alert_settings`:** új entitás + új lista a pullban; a pull `changes` objektuma `additionalProperties: false`, így ez is szerver-először bővítés.
- **Push tokenek a `devices`-ban:** új mező az entitásban – válaszoldali bővítés, a régi app `__DEV__`-ben jelez.
- **Diszpécser, websocket:** a szerződés nem foglalkozik vele; egy harmadik fogyasztó a README és a végponttábla hiányát (SCH-010, SCH-006) és a negatív vektorok hiányát (SCH-003) érezné meg leginkább.

Összegezve: a jelenlegi szerkezet **nem zárja ki** a 2. lépcsőt, újratervezés nem kell; a verzióegyeztetés (SCH-002, SCH-008) a feltétele annak, hogy a bővítések kockázat nélkül kerüljenek ki.

## 19. Pozitívumok és jól megvalósított megoldások

1. **A hash-stabilitás következetes végiggondolása:** egész számú koordináták, egyetlen szöveges alak minden azonosítóra és időbélyegre, `media: [{id, sha256}]` a duplikált `media_ids` helyett, a kanonizálás PHP-csapdáinak (escape-flagek, `{}` → `[]`) dokumentálása.
2. **Független ellenőrzés a vektorokra:** a JCS-t egy külső implementáció, a PBKDF2-t WebCrypto és RFC-vektor, a menetrendet kézi várt értékek ellenőrzik – nem a generátor önmagát.
3. **Bájtazonossági tesztek** minden generált fájlra: kézi szerkesztés vagy elfelejtett újragenerálás nem marad rejtve.
4. **Feltételes szabályok a sémában** ott, ahol a mezőkből eldönthető (a `scan` hét szabálya, a menetrend módjai, a helyadat mindent-vagy-semmit, a PIN-mezők), és a döntés arról, mi marad a backendnek.
5. **A típusgenerálás minősége:** egy típus egyszer, diszkriminált `ChainEntry`, `SchemaTypes` térkép a szűkítő validátorhoz, a legszigorúbb TS-beállításokkal fordul.
6. **Érvénytelen példák, amelyek valódi hibákat modelleznek** (a specifikáció szó szerinti példája, a Laravel alapértelmezett hibaalakja, a kliens által küldött szerveroldali mezők), mindegyik egyetlen okból bukik.
7. **A döntésnapló:** minden eltérés a specifikációtól nyomon követhető.
8. **Teljes Ajv ↔ opis paritás** a példákon, amit ez az audit is megerősített.

## 20. Fő kockázatok

1. Hibás szerződés kerül ki, mert nincs CI (SCH-001).
2. Az app és a backend észrevétlenül eltérő sémaverzióval épül (SCH-002).
3. Egy app–backend verzióeltérés megállítja a láncfeltöltést (SCH-008).
4. Egy jövőbeli implementáció a hibás vagy határesetű bemenetre eltérő lenyomatot ad, mert a határesetek nincsenek közös vektorban (SCH-003).
5. A szerver és az app a hónap- vagy évváltáskor más köröket vár (SCH-004).

## 21. Összesített minősítés

| Terület | Minősítés |
|---|---|
| JSON Schema helyesség és szigor | kiváló (kisebb, LOW szintű lazaságokkal) |
| API-szerződés | jó; a végpontszintű és viselkedési szerződés hiányos |
| Lánc és kanonizálás | kiváló; a negatív vektorok hiányoznak |
| Menetrend-vektorok | jó; a naptárhatárok hiányoznak |
| PIN-vektorok | kiváló |
| TS-típusok | kiváló, egy rendszerszintű generátorhibával |
| Composer / opis | jó; paritás igazolva, de nem automatizált |
| Csomagolás, verziózás, kiadás | **gyenge** |
| CI | **hiányzik** |
| Dokumentáció | jó döntésnapló, README nélkül |

**Összesítve: 7,5 / 10.** A szerződés tartalma 9/10-es; a kiadási folyamat (CI, verziórögzítés, kompatibilitási szabály) húzza le.

## 22. Prioritásos javítási javaslatok

1. **CI** a teljes `npm test`-tel, `typecheck`-kel, `composer validate`-tel, a Composer-próbával és egy opis-paritás lépéssel; branch-védelem, tag csak zöld CI után (SCH-001, SCH-018).
2. **Verziórögzítés a fogyasztóknál:** git-tagre hivatkozó npm- és Composer-függőség, a `path`/`file:` csak helyi felülírás; sémaverzió-fejléc a válaszokban (SCH-002, SCH-011).
3. **Kompatibilitási szabály** a CHANGELOG-ban (szerver-először, mátrix), döntés a `$id`-verzióról, amíg 0.x (SCH-008, SCH-028).
4. **Negatív és normalizálási lánc-vektorok**, a PHP-recept pontosítása (SCH-003).
5. **Naptárhatár-vektorok** a menetrendhez (SCH-004).
6. **TS-generátor:** `$ref` + `enum` szűkítés (SCH-005).
7. **Végponttábla** (OpenAPI vagy saját), query-sémák, az idempotencia-protokoll a szerződésbe (SCH-006, SCH-007, SCH-030).
8. **README** (SCH-010) és a döntésnapló frissítése (SCH-019, SCH-017).
9. A LOW szintű sémaszigorítások egy minor kiadásban: SCH-012 – SCH-016, SCH-020, SCH-022, SCH-029; egységes lapozás (SCH-009).

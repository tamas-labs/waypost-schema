# Waypost Schema – auditált hibajegyzék

Audit dátuma: 2026-11-04 · Vizsgált változat: `@waypost/schema` / `waypost/schema` **0.5.0** (`87dc39e`, tag `v0.5.0`, `origin/main`-nel azonos) · Szempontrendszer: [`docs/audit.20261104.md`](docs/audit.20261104.md)

A kapcsolódó jelentések: [`AUDIT-REPORT.md`](AUDIT-REPORT.md) (átfogó értékelés), [`AUDIT-COMPLIANCE.md`](AUDIT-COMPLIANCE.md) (megfelelőségi mátrix).

## Összesítés

| Súlyosság | Hibák száma |
|---|---:|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 8 |
| LOW | 11 |
| INFO | 9 |
| **Összesen** | **30** |

| ID | Cím | Súlyosság | Jelleg |
|---|---|---|---|
| SCH-001 | Nincs CI, amely a szerződést ellenőrizné | HIGH | specifikációs eltérés (kötelező elvárás hiánya) |
| SCH-002 | A fogyasztók nem rögzítik a szerződés verzióját; a lockfájlok elavult állapotot mutatnak | HIGH | tényleges hiba (kiadási folyamat) |
| SCH-003 | A lánc-tesztvektorok csak pozitív esetek; a hibás bemenet kezelése nincs közösen rögzítve | MEDIUM | tesztvektor-hiány |
| SCH-004 | A menetrend-vektorok nem fedik le a hónap-, év- és hétváltást, a többnapos DST-időszakot és más időzónát | MEDIUM | tesztvektor-hiány |
| SCH-005 | A TS-generátor elhagyja a `$ref` melletti `enum`-szűkítést (`ErrorCode` a 3 értékű mezőkben) | MEDIUM | tényleges hiba (generátor) |
| SCH-006 | A végpontszintű szerződés (metódus, útvonal, query, státusz → séma) nem géppel olvasható | MEDIUM | szerződéshiány |
| SCH-007 | Az `Idempotency-Key` protokoll csak a backend döntéseiben létezik | MEDIUM | szerződéshiány |
| SCH-008 | A verzióeltérés (app ↔ backend) és a `/v2` együttélése nincs megtervezve | MEDIUM | architekturális kockázat |
| SCH-009 | Következetlen lapozás; a CRUD-listák korlátlanok | MEDIUM | konzisztencia / skálázhatóság |
| SCH-010 | Nincs README és fogyasztói használati útmutató | MEDIUM | dokumentáció hiánya |
| SCH-011 | A Composer `archive.exclude` kizárja az `examples/`-t, amelyre a backend tesztjei épülnek | LOW | rejtett függőség |
| SCH-012 | A base64-mezők hosszkorlátja nem rögzíti a bájthosszt; nem kanonikus base64 is átmegy | LOW | túl megengedő séma |
| SCH-013 | A diagnosztikai kérésben az `expected_seq` nincs a `code`-hoz kötve | LOW | túl megengedő séma |
| SCH-014 | Az `api/error.json` bejegyzésszintű kódot is elfogad, az üzenet hossza korlátlan | LOW | túl megengedő séma |
| SCH-015 | Felső korlát nélküli egészek és tömbök | LOW | bemeneti korlát hiánya |
| SCH-016 | A `media` egyedisége objektumra, nem azonosítóra vonatkozik | LOW | túl megengedő séma |
| SCH-017 | A `schedule` entitás leírása szerint `interval_to = interval_from` érvényes éjféli ablak | LOW | belső ellentmondás |
| SCH-018 | A `format` kulcsszó az Ajv és az opis között eltér; az opis-paritást semmi nem ellenőrzi folyamatosan | LOW | validátor-eltérés |
| SCH-019 | Elavult számok és állítások a `docs/decisions.md`-ben | LOW | dokumentáció |
| SCH-020 | A jelentés letöltési URL-je `http://` is lehet | LOW | biztonság |
| SCH-021 | A `validate.js` nem ellenőrzi, miért bukik el egy érvénytelen példa | LOW | tesztminőség |
| SCH-022 | A `push-final` elfogad üres, `done: false` kérést | INFO | megfigyelés |
| SCH-023 | A 6 jegyű PIN offline ellenőrzője kinyerés után gyorsan törhető | INFO | specifikációs kockázat |
| SCH-024 | Az `X-Acting-User` bizalmi határa nincs a szerződésben | INFO | specifikációs kockázat |
| SCH-025 | A láncbejegyzésnek nincs formátumverziója | INFO | jövőbeli kockázat |
| SCH-026 | A menetrend-vektorok nem rögzítik a tzdata verzióját | INFO | megfigyelés |
| SCH-027 | `Paths::schemaNames()` csak egy könyvtárszintet lát | INFO | jövőbeli kockázat |
| SCH-028 | Az app outboxa sémaútvonalakat tárol tartósan | INFO | jövőbeli kockázat |
| SCH-029 | A `validation_failed` `details` nélkül is érvényes | INFO | dokumentált döntés |
| SCH-030 | A backend olyan letöltő végpontokat nyújt, amelyek a szerződésben nem szerepelnek | INFO | megfigyelés |

A bizonyosság jelölése: **bizonyított** = futtatott ellenőrzéssel vagy a forrás közvetlen olvasásával igazolva; **erősen valószínű** = a forrásból következik, de nem futtattam a kiváltó helyzetet; **feltételezés** = jövőbeli vagy nem látott környezetre vonatkozik.

---

## CRITICAL

Nincs. A lánc formátuma, a kanonikus JSON és a HMAC-vektorok függetlenül újraszámolva helyesek (lásd [`AUDIT-REPORT.md`](AUDIT-REPORT.md) 7. pont); integritást sértő hibát nem találtam.

---

## HIGH

### SCH-001 – Nincs CI, amely a szerződést ellenőrizné

- **Súlyosság:** HIGH
- **Érintett fájlok:** a repó gyökere (nincs `.github/`, és más CI-konfiguráció sincs a `git ls-files` listájában); [`package.json:46`](package.json#L46) (`test` szkript); [`scripts/composer-smoke.sh:1-67`](scripts/composer-smoke.sh) (csak kézzel, Dockerrel fut); specifikáció: `../waypost/docs/Waypost – fejlesztői specifikáció (1. lépcső).md:499`.
- **Leírás:** A specifikáció a *Tesztelés* szakaszban kifejezetten előírja: „`waypost-schema`: minden sémához érvényes és érvénytelen példa; **CI-ben validálás**.” A repóban nincs semmilyen CI-pipeline. Az `npm test` helyben jól működik (57/57 teszt zöld, 77 séma, 180 érvényes és 354 érvénytelen példa), de csak akkor fut, ha valaki elindítja. A Composer-telepítési próba (`composer-smoke.sh`) és a `composer validate` nincs is az `npm test`-ben.
- **Miért probléma?** A kiadás egy `git push` + tag. Semmi nem akadályozza meg, hogy egy hibás, elavult generált fájllal (`types/`, `lib/generated/`, vektorok) vagy elbukó példával rendelkező commit a `main`-re és tagre kerüljön, miközben a két fogyasztó szimlinken azonnal megkapja (SCH-002).
- **Következmény:** Egy hibás séma egyszerre két alkalmazást törhet el; a hibát csak a fogyasztók tesztjei vagy a terep fedezi fel.
- **Javítás:** GitHub Actions workflow `push` és `pull_request` eseményre: `npm ci`, `npm test`, `npm run typecheck`, `composer validate` (pl. `composer:2` image), `sh scripts/composer-smoke.sh`, és – SCH-018 miatt – egy opis-paritás lépés, amely minden példát az opis/json-schema-val is lefuttat. Branch-védelem a `main`-en, tag csak zöld CI után.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** specifikáció *Automatikus tesztek*; N (Tesztelés és CI), J.

### SCH-002 – A fogyasztók nem rögzítik a szerződés verzióját; a lockfájlok elavult állapotot mutatnak

- **Súlyosság:** HIGH
- **Érintett fájlok:**
  - `../waypost/package.json:9` (`"@waypost/schema": "file:../waypost-schema"`) és `../waypost/package-lock.json:83-85` (a lock **0.4.0**-t rögzít, a lemezen 0.5.0 van);
  - `../laravel-waypost/composer.json:13,24-31` (`path` repository, `symlink: true`, kézzel felülírt `"versions": {"waypost/schema": "0.5.0"}`) és `../laravel-waypost/composer.lock:6485` (`reference: 843994f…` = a **v0.4.0** commitja);
  - [`package.json:6`](package.json#L6) (`"private": true` – npm-registryből nem terjeszthető);
  - [`docs/decisions.md:306`](docs/decisions.md#L306) („a Composer a git tagből olvassa”).
- **Leírás:** Mindkét fogyasztó szimlinken át a szomszédos munkakönyvtárat használja. Amit kapnak, az nem egy verzió, hanem a `../waypost-schema` aktuális munkapéldánya (akár commitolatlan változással). A lockfájlok emiatt nem a valós tartalmat rögzítik: az app lockja 0.4.0-t, a backend lockja a 0.4.0-s commitot mutatja, miközben mindkettő 0.5.0-t használ. A Composer path-telepítés a valóságban `dev-main`-t ad (a `composer-smoke.sh` futása: „ok: waypost/schema dev-main, 77 schemas”, pedig a HEAD pontosan `v0.5.0`), ezért a backend a verziót kézzel írja felül – ezt minden kiadásnál kézzel kell léptetni. Futásidőben sincs jelzés: egyik válasz vagy fejléc sem mondja meg, melyik sémaverzióval dolgozik a szerver.
- **Miért probléma?** A fogyasztók buildje és tesztje nem reprodukálható: egy friss checkout csak akkor zöld, ha mellette a séma repó pont a megfelelő állapotban van. Ez már meg is történt: `../waypost/docs/tasks.md:403` szerint a GitHubon lévő séma régebbi volt annál, amire az app épült, és friss checkouton a `typecheck` és 5 tesztcsomag piros volt.
- **Következmény:** Az app és a backend észrevétlenül eltérő szerződésverzióval épülhet és kerülhet ki; a hiba csak futásidőben (422, sémahiba `__DEV__`-ben, vagy csendes adatvesztés egy új mezőnél) derül ki.
- **Javítás:** (1) A fogyasztók git-tagre hivatkozzanak: npm `git+https://…#v0.5.0` (vagy privát registry, `private: false` + `publishConfig`), Composer `vcs` repository `^0.5` megkötéssel; a `path`/`file:` csak opcionális helyi felülírás legyen. (2) A `package.json` verziója és a tag egyezését a CI ellenőrizze. (3) A backend minden válaszban küldje a sémaverziót (pl. `X-Waypost-Schema: 0.5.0`), az app `__DEV__`-ben hasonlítsa össze a beépítettel. (4) A `docs/decisions.md:306` állítását javítani kell.
- **Bizonyosság:** bizonyított (lockfájlok, `composer-smoke.sh` kimenete, `tasks.md:403`).
- **Követelmény / terület:** I (npm/Composer összhang), J (verziózás), K.

---

## MEDIUM

### SCH-003 – A lánc-tesztvektorok csak pozitív esetek; a hibás bemenet kezelése nincs közösen rögzítve

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`scripts/chain-vectors.js:116-214`](scripts/chain-vectors.js#L116-L214) (`CASES`), [`chain/test-vectors.json`](chain/test-vectors.json); [`scripts/chain-vectors.test.js:35-39`](scripts/chain-vectors.test.js#L35-L39) (a negatív esetek csak a JS-implementáció saját tesztjében); [`docs/decisions.md:77`](docs/decisions.md#L77) és [`docs/decisions.md:223`](docs/decisions.md#L223); összevetésül `../laravel-waypost/src/Chain/CanonicalJson.php:44-51`.
- **Leírás:** A 10 önálló és 3 láncolt vektor helyes (Pythonban, saját JCS-sel és `hmac`-kel újraszámolva mind a 13 egyezik), de mind érvényes bemenet. Nincs közös vektor arra, hogy mit kell tenni a következőkkel: `1.0` (JSON Schemában egész, a PHP `json_decode` floatként olvassa), `1.5`, 2⁵³, magányos surrogate, `hash` mező a HMAC bemenetében, hiányzó `null` mező, `\b` / `\f` / U+0000 escape, üres objektum. A `decisions.md:77` azt állítja, hogy az `1.0` és az `1` lenyomata azonos, a `:223` PHP-receptje (`json_encode` a `json_decode` kimenetén) viszont `1.0`-t írna ki – a backend ezt saját döntéssel javította (`CanonicalJson.php:44-51`), a szerződés nem írja elő.
- **Miért probléma?** A specifikáció szerint a lánc a két legkönnyebben elcsúszó rész egyike, és a közös vektoroknak kell bizonyítaniuk, hogy a két nyelv ugyanúgy viselkedik. A hibás bemenetre adott viselkedés (kivétel vs. csendes normalizálás) ma implementációnként dől el.
- **Következmény:** Egy későbbi átírás vagy egy harmadik implementáció (pl. diszpécserfelület, 2. lépcső) a hibás vagy határesetű bemenetre eltérő lenyomatot vagy eltérő elutasítást adhat; ez `bad_hmac`-ként vagy egy hibás bejegyzés elfogadásaként jelenik meg.
- **Javítás:** A `chain/test-vectors.json` kapjon `invalid_inputs[]` részt (`{ name, input_json (nyers szöveg), expected: "reject" }`) és `normalized[]` részt (pl. `"seq": 1.0` → ugyanaz a `canonical_json`, mint `1`-gyel), a nyers JSON-szöveggel, hogy a dekódolás is a teszt része legyen. A `decisions.md:223` receptje egészüljön ki a float → int normalizálással és a kivételekkel.
- **Bizonyosság:** bizonyított (a vektorok tartalma és a recept); a PHP-viselkedés a recepttel erősen valószínű.
- **Követelmény / terület:** D, E (láncteszt-vektorok: „szélsőértékek és hibás bemenetek”).

### SCH-004 – A menetrend-vektorok nem fedik le a hónap-, év- és hétváltást, a többnapos DST-időszakot és más időzónát

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`scripts/schedule-vectors.js:137-230`](scripts/schedule-vectors.js#L137) (az esetek), [`schedule/test-vectors.json`](schedule/test-vectors.json).
- **Leírás:** A 16 kibontási eset (79 kör) helyes – Python `zoneinfo`-val, a Q5-szabály saját implementációjával mind egyezik –, és jól lefedi a DST-éjszakákat, a nem létező és a kétszer előforduló időpontot, az éjfélen átnyúló listát és a péntek–szombat szabályt. Hiányzik viszont: hónapváltáson átnyúló ablak (pl. 10-31 20:00 → 11-01 08:00), évváltás (12-31 → 01-01), szökőnap (2028-02-28 → 02-29), vasárnap → hétfő átnyúlás, többnapos időszak (heti/havi jelentés), amely DST-váltást tartalmaz, `interval_every_min = 1440`, és nem `Europe/Budapest` szabályú DST-zóna (a `timezone` telephelyenként állítható).
- **Miért probléma?** A PHP (`DateTime::modify`, `DatePeriod`) és a TS (dátumaritmetika naiv ms-ban vagy Temporalban) jellemzően éppen a hónap-/évhatáron és a többnapos tartományokon tér el. A specifikáció a közös vektorokat éppen az eltérés kiszűrésére írja elő.
- **Következmény:** A jelentés (szerver) és az ébresztés/kör (app) más köröket várhat egy hónap utolsó éjszakáján vagy szilveszterkor; ez „elmaradt” kört jelenthet, ami meg sem nyílt az appban.
- **Javítás:** Új esetek a generátorban: `month-boundary`, `year-boundary`, `leap-day`, `sunday-into-monday`, `weekly-period-with-dst` (pl. 2026-10-19…10-25), `every-1440`, és egy nem európai DST-zóna (pl. `America/New_York` vagy `America/Santiago`). A kézi várt értékek a `schedule-vectors.test.js`-be.
- **Bizonyosság:** bizonyított (lefedettség); az eltérés kockázata erősen valószínű.
- **Követelmény / terület:** E (menetrend-vektorok).

### SCH-005 – A TS-generátor elhagyja a `$ref` melletti `enum`-szűkítést

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`scripts/types.js:73-75`](scripts/types.js#L73-L75); [`schemas/api/sync-push.response.json:47`](schemas/api/sync-push.response.json#L47) és [`schemas/api/device-diagnostic.request.json:26`](schemas/api/device-diagnostic.request.json#L26) (`"$ref": "../common/error-code.json", "enum": ["chain_gap", "chain_fork", "bad_hmac"]`); eredmény: [`types/index.d.ts:739`](types/index.d.ts#L739) és [`types/index.d.ts:1338`](types/index.d.ts#L1338) (`code: ErrorCode` – mind a 12 kód).
- **Leírás:** A `prepare()` a `$ref`-et `tsType`-ra cseréli, a json-schema-to-typescript pedig a `tsType`-ot használja, a mellette álló `enum`-ot nem. A séma 3 értéket enged, a típus 12-t.
- **Miért probléma?** A CLAUDE.md és a `decisions.md:280` szerint a típus „ne legyen szigorúbb a sémánál” – ezt a példák lefordítása ellenőrzi –, de arra nincs ellenőrzés, hogy ne legyen lazább. A hiba rendszerszintű: bármely jövőbeli `$ref` + szűkítő testvérkulcsszó (`enum`, `const`) csendben elveszik.
- **Következmény:** Az app `DeviceDiagnosticRequest`-et `code: 'forbidden'`-del is fordít, a backend 422-vel utasítja el; a `rejected[].code` feletti `switch` nem kényszerít kimerítő kezelést a valós 3 értékre.
- **Javítás:** A generátor `$ref` + `enum`/`const` esetén az `enum` uniót adja (`Extract<ErrorCode, …>` vagy közvetlen literál-unió), vagy hibával álljon le. Teszt a `types-sample.ts`-ben: `// @ts-expect-error` egy `code: 'forbidden'` diagnosztikára.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** G (TS-típusgenerálás).

### SCH-006 – A végpontszintű szerződés nem géppel olvasható

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`schemas/api/`](schemas/api/) (nincs `sync-pull.request`, sem lista-query séma); a query paraméterek csak leírásban: [`schemas/api/sync-pull.response.json:18-23`](schemas/api/sync-pull.response.json#L18) (`cursor`), [`schemas/api/report-list.response.json:5`](schemas/api/report-list.response.json#L5) (`site_id`, `type`, `cursor`), [`schemas/api/user-list.response.json:5`](schemas/api/user-list.response.json#L5), [`schemas/api/schedule-list.response.json:5`](schemas/api/schedule-list.response.json#L5) stb.; a metódus/útvonal/státusz csak a `description`-ökben (pl. [`schemas/api/site.response.json:5`](schemas/api/site.response.json#L5)).
- **Leírás:** A sémák csak a JSON-törzseket írják le. Nincs gépi leírás arról, melyik metódus + útvonal melyik kérés- és válaszsémát használja, milyen státuszkóddal, és milyen query paramétereket fogad (`cursor`, `site_id`, `route_id`, `user_id`, `type`). A backend útvonaltáblája (`../laravel-waypost/routes/api.php`) és az app végpontlistája (`../waypost/src/api/endpoints.ts`, `config-calls.ts`) ezt kézzel, külön-külön tartja nyilván.
- **Miért probléma?** A query paraméterek formátumát (UUID? üres érték? ismeretlen szűrő?) két oldal külön implementálja, és semmi nem ellenőrzi, hogy minden végponthoz tartozik-e séma, illetve hogy a két oldal ugyanazt a sémát köti-e ugyanahhoz az útvonalhoz.
- **Következmény:** Egy átnevezett vagy rossz útvonalhoz kötött séma, egy eltérően értelmezett szűrő csak integrációkor derül ki.
- **Javítás:** Egy `schemas/api/endpoints.json` (vagy OpenAPI 3.1 dokumentum, amely a meglévő sémákra `$ref`-fel hivatkozik): metódus, útvonal, token, kérés-/válaszséma, státuszkódok, query-séma (`api/<végpont>.query.json`). A `validate.js` ellenőrizze, hogy minden `api/` séma szerepel benne; a backend és az app tesztje ebből ellenőrizze a saját útvonaltábláját.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** C (API-szerződések), K.

### SCH-007 – Az `Idempotency-Key` protokoll csak a backend döntéseiben létezik

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`schemas/api/devices-enroll.response.json:5`](schemas/api/devices-enroll.response.json#L5) („returned only by this response, never again”); [`schemas/api/user.response.json:18`](schemas/api/user.response.json#L18) (`pin`, „the only time it is shown”); a fejléc csak `description`-ökben szerepel (pl. [`schemas/api/sync-push.request.json:5`](schemas/api/sync-push.request.json#L5)); összevetésül `../laravel-waypost/docs/decisions.md:191-202, 246, 278, 356, 378-381`, `../waypost/src/api/endpoints.ts:105`.
- **Leírás:** Az idempotencia tényleges szabályai – a kulcs formátuma (bármely UUID), hatóköre (tokengazdánként), hogy a 4xx is tárolódik és 24 órán át visszajátszódik, hogy a még futó kérés `409` + `Retry-After: 5`, hogy a hiányzó kulcs `validation_failed` `details: {"Idempotency-Key": …}` – csak a backend `decisions.md`-jében vannak. Az app ezekre építve dolgozik (a fotó minden próbálkozásnál új kulcsot kap, mert a 404 is visszajátszódik). A sémaleírás szerint a token és a titok „soha többé” nem jön vissza, valójában 24 órán át ugyanazzal a kulccsal visszajön (szándékosan, titkosítva tárolva).
- **Miért probléma?** A „szerződés előbb itt” elv sérül: a két oldal közötti viselkedési megállapodás nem a közös szerződésrétegben van, és a `409 conflict` két jelentését (valódi ütközés vs. még futó kérés) a hibaséma nem különbözteti meg.
- **Következmény:** Egy új kliens (vagy a 2. lépcső diszpécserfelülete) a sémák alapján rosszul kezeli a `409`-et, vagy ugyanazzal a kulccsal próbál újra egy 404 után, és 24 órán át ugyanazt kapja.
- **Javítás:** `docs/decisions.md` bejegyzés és egy `common/idempotency-key.json` séma; a `description`-ök pontosítása („…never again, except an identical replay of this request with the same Idempotency-Key within 24 hours”); a `409`-es foglaltság saját hibakódot kaphatna (pl. `request_in_progress`, minor bővítés).
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** C, K, L.

### SCH-008 – A verzióeltérés (app ↔ backend) és a `/v2` együttélése nincs megtervezve

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`CHANGELOG.md:7-9`](CHANGELOG.md#L7-L9) (verziózási szabály); minden séma `$id`-ja (pl. [`schemas/chain/entry.json:3`](schemas/chain/entry.json#L3): `https://waypost.dev/schema/chain/entry.json` – verzió nélkül); [`docs/decisions.md:14-19`](docs/decisions.md#L14), [`docs/decisions.md:67-72`](docs/decisions.md#L67), [`docs/decisions.md:139-144`](docs/decisions.md#L139); [`schemas/chain/entry.json`](schemas/chain/entry.json) `type` zárt felsorolása.
- **Leírás:** A specifikáció szerint törő változás = új major és új `/vN` API. Az app áruházon át frissül, ezért a backendnek egy ideig `/v1`-et és `/v2`-t is ki kell szolgálnia. Egy csomagban azonban csak egy sémakészlet van, a `$id`-kban nincs verzió, így a két készlet nem tölthető be egyszerre ugyanabba a validátorba. Emellett az `additionalProperties: false` és a zárt felsorolások miatt a CHANGELOG szerinti „minor” bővítés a régebbi sémával ellenőrző fogadónak törő: a régi backend 422-vel utasítja el az új app új, opcionális mezőjét (pl. a 0.3.0 `photo_media_id`); egy új bejegyzéstípus (`sos`) a régi backendnél az egész push-köteget 422-re futtatja, és mivel a lánc nem ugorhat át bejegyzést, a feltöltés minden későbbi bejegyzésre megáll. A helyes telepítési sorrend (séma → backend → app) csak a `decisions.md:139-144` egy mondatában szerepel, a CHANGELOG szabályában nem.
- **Miért probléma?** A kompatibilitás ma a telepítési sorrenden múlik, amelyet sem dokumentum, sem futásidejű jelzés (SCH-002) nem biztosít.
- **Következmény:** Egy korábban kiadott app-verzió és egy frissített backend (vagy fordítva) között a szinkron leállhat; a láncnál ez adatfeltöltési blokkoláshoz vezet.
- **Javítás:** (1) A CHANGELOG-szabály egészüljön ki: kérésoldali bővítés csak backend-először, válaszoldali bővítés opcionális mezőként, és a „minor” kompatibilitási mátrix (régi app × új backend, új app × régi backend). (2) A `$id` kapjon főverziót (`https://waypost.dev/schema/v1/...`), mielőtt bármelyik fogyasztó közvetlenül hivatkozna rá – a `decisions.md:19` szerint 0.x alatt ez még major nélkül megtehető. (3) Döntés arról, hogyan él együtt a `/v1` és a `/v2` készlet (pl. `schemas/v1/`, `schemas/v2/` egy csomagban).
- **Bizonyosság:** erősen valószínű (a sémák és a backend `ValidateSchema` működéséből következik; a helyzetet nem idéztem elő).
- **Követelmény / terület:** J, 4. (2. lépcső), specifikáció *Repo és technológiai stack* és *A 2. lépcső előkészítése*.

### SCH-009 – Következetlen lapozás; a CRUD-listák korlátlanok

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** [`schemas/api/sync-pull.response.json:18-26`](schemas/api/sync-pull.response.json#L18) (`cursor` mindig szöveg + `has_more`); [`schemas/api/report-list.response.json:23`](schemas/api/report-list.response.json#L23) (`next_cursor`, utolsó oldalon `null`); lapozás és `maxItems` nélkül: [`site-list.response.json:16`](schemas/api/site-list.response.json#L16), [`user-list.response.json:16`](schemas/api/user-list.response.json#L16), [`checkpoint-list.response.json:16`](schemas/api/checkpoint-list.response.json#L16), [`route-list.response.json:16`](schemas/api/route-list.response.json#L16), [`route-version-list.response.json:17,23`](schemas/api/route-version-list.response.json#L17), [`schedule-list.response.json:16`](schemas/api/schedule-list.response.json#L16), [`report-subscription-list.response.json:16`](schemas/api/report-subscription-list.response.json#L16).
- **Leírás:** Két lapozott végpontnak két különböző lapozási alakja van (`cursor` + `has_more` vs. `next_cursor | null`), a hét CRUD-lista pedig egyáltalán nem lapoz, és nincs felső elemszáma. A `GET /checkpoints` egy több telephelyes supervisornál minden pontot egy válaszban ad.
- **Miért probléma?** Egy közös kliensoldali lapozó nem írható; később a CRUD-listák lapozása törő változás lesz (új kötelező mező vagy viselkedésváltozás).
- **Következmény:** Nagy ügyfélnél memória- és időtúllépési kockázat; a jövőbeli lapozás major verziót kényszerít.
- **Javítás:** Egy közös lapozási minta (`common/page.json`: `next_cursor: string | null`), most még opcionális mezőként a CRUD-listákban, és egy dokumentált alapértelmezett oldalméret. A pull alakja maradhat (más a szemantikája), de a döntés kerüljön a `decisions.md`-be.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** C („a lapozás… szerződése következetes-e”), L (tömeges adat).

### SCH-010 – Nincs README és fogyasztói használati útmutató

- **Súlyosság:** MEDIUM
- **Érintett fájlok:** a repó gyökere (nincs `README.md`); a tudás szétszórva: [`CLAUDE.md`](CLAUDE.md) (agentnek szóló szabályok), [`docs/decisions.md:294-309`](docs/decisions.md#L294) (csomagolás, opis-recept), [`src/Paths.php:9-15`](src/Paths.php#L9-L15) (docblock).
- **Leírás:** Nincs belépési dokumentum, amely leírná a csomag szerepét, a telepítést mindkét ökoszisztémában, az Ajv kötelező beállításait (`strict`, `ajv-formats`), az opis `registerPrefix`-receptjét, a tesztvektorok használatát, egy új séma vagy végpont felvételének lépéseit és a kompatibilis változtatás szabályait. A Composer-archívum a `CLAUDE.md`-t tartalmazza, README-t nem; az npm-csomagban egyik sincs.
- **Miért probléma?** A paritás (SCH-018) azon múlik, hogy a fogyasztó ugyanazokkal a beállításokkal validál; ez most csak egy döntésnapló mélyén olvasható.
- **Következmény:** Új fejlesztő vagy új fogyasztó (2. lépcső) eltérő validátorbeállítással dolgozik, vagy kihagyja a formátumellenőrzést.
- **Javítás:** Magyar `README.md`: szerep, telepítés (npm, Composer), validálási recept mindkét nyelven, vektorok, „új séma / új végpont” lépései, kompatibilitási szabályok (SCH-008), parancsok. A `package.json` `files` tömbjébe is.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** O (Dokumentáció).

---

## LOW

### SCH-011 – A Composer `archive.exclude` kizárja az `examples/`-t, amelyre a backend tesztjei épülnek

- **Súlyosság:** LOW
- **Érintett fájlok:** [`composer.json:14-24`](composer.json#L14-L24) (`"/examples"`); `../laravel-waypost/tests/Feature/Api/SchemaValidationTest.php:44,120`.
- **Leírás:** A backend tesztjei a `Paths::root() . '/examples/...'` fájlokat olvassák. `path` + szimlink mellett működik, de dist-archívumból (VCS-tag zip, privát Packagist) telepítve az `examples/` hiányzik. A `:120` teszt hangosan elbukik (`toBeGreaterThan(10)`), a `:44` hibás bemenettel fut tovább.
- **Miért probléma?** Rejtett, nem deklarált függőség a csomag belső fájljára; az SCH-002 javítása (valódi verziózott telepítés) azonnal eltöri a backend tesztjeit.
- **Következmény:** Elbukó backend-tesztek a szerződésváltás pillanatában.
- **Javítás:** Vagy az `examples/` maradjon az archívumban, és a `Paths` adjon rá függvényt (`Paths::examplesDirectory()`), vagy a backend saját fixture-öket használjon.
- **Bizonyosság:** bizonyított (konfiguráció); a dist-telepítést nem futtattam.
- **Követelmény / terület:** H, I.

### SCH-012 – A base64-mezők hosszkorlátja nem rögzíti a bájthosszt; nem kanonikus base64 is átmegy

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/common/base64.json:8`](schemas/common/base64.json#L8); [`schemas/api/devices-enroll.response.json:26-31`](schemas/api/devices-enroll.response.json#L26-L31) (`secret`, 44 karakter); [`schemas/entities/user.json:41`](schemas/entities/user.json#L41) (`pin_hash`, 44), [`schemas/entities/user.json:55`](schemas/entities/user.json#L55) (`pin_salt`, 24).
- **Leírás:** 44 base64-karakter 31, 32 vagy 33 bájtot is jelenthet, 24 karakter 16, 17 vagy 18 bájtot. Ajv-vel kipróbálva: 31 és 33 bájtos `secret`, 17 és 18 bájtos `pin_salt` is érvényes. A minta a nem nulla kitöltőbiteket sem tiltja (`AB==` és `AA==` ugyanazt a bájtot jelenti) – mindkét validátor elfogadja –, holott a `decisions.md:35-44` szerint minden értéknek pontosan egy szöveges alakja van.
- **Miért probléma?** A leírás 32/16 bájtot ígér, a séma nem garantálja.
- **Következmény:** Egy hibás szerver 31 bájtos HMAC-kulcsot adhat ki, amelyet az app elfogad; a láncot ugyan mindkét oldal ugyanazzal a kulccsal számolja, de a hiba csak kézi vizsgálattal derül ki.
- **Javítás:** Mezőnkénti pontos minta: 32 bájt = `^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$`, 16 bájt = `^[A-Za-z0-9+/]{21}[AQgw]==$`; a közös mintában a kitöltés előtti utolsó karakter megszorítása.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** B, L.

### SCH-013 – A diagnosztikai kérésben az `expected_seq` nincs a `code`-hoz kötve

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/api/device-diagnostic.request.json:44`](schemas/api/device-diagnostic.request.json#L44); összevetésül [`schemas/api/sync-push.response.json`](schemas/api/sync-push.response.json) `rejected.items` `if/then/else`-e.
- **Leírás:** A push-válaszban `chain_gap` ⇔ `expected_seq` egész, egyébként `null`; a diagnosztikai kérés, amely ugyanezt az elutasítást adja tovább, ezt nem köti meg. Kipróbálva: `chain_fork` + `expected_seq: 5` és `chain_gap` + `expected_seq: null` is érvényes.
- **Miért probléma?** Ugyanaz a fogalom két helyen eltérő szigorral; a jelentés (M6) hibás diagnosztikát is kaphat.
- **Következmény:** Félrevezető diagnosztika a műszakjelentésben.
- **Javítás:** Ugyanaz az `if/then/else`, mint a push-válaszban (minor szigorítás – mivel csak az app küldi, egyeztetett kiadással).
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** B, C.

### SCH-014 – Az `api/error.json` bejegyzésszintű kódot is elfogad, az üzenet hossza korlátlan

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/api/error.json:14-19`](schemas/api/error.json#L14-L19), [`schemas/common/error-code.json`](schemas/common/error-code.json).
- **Leírás:** A hibaválasz `error.code`-ja a teljes, 12 elemű felsorolás, így egy kérésszintű `chain_gap` hibaválasz is érvényes (kipróbálva). Az `error.message`-nek és a `details` üzeneteinek nincs `maxLength`-je, a `details` kulcsainak nincs mintája.
- **Miért probléma?** A séma nem különíti el a kérés- és a bejegyzésszintű kódokat, pedig a `decisions.md:60-65` szerint a push `rejected` ezek részhalmaza; a hibaválaszra ugyanez a megszorítás hiányzik.
- **Következmény:** A backend hibás kódhasználatát a válaszsématesztek nem fogják meg.
- **Javítás:** `common/request-error-code.json` (a 9 kérésszintű kód) az `api/error.json`-ben; `maxLength` (pl. 1000) az üzenetekre.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** C, L.

### SCH-015 – Felső korlát nélküli egészek és tömbök

- **Súlyosság:** LOW
- **Érintett fájlok:** egészek: [`schemas/api/route-version-create.request.json:15,40`](schemas/api/route-version-create.request.json#L15) (`walk_duration_s`, `walk_time_from_prev_s`), [`schemas/entities/route-version.json:22,27`](schemas/entities/route-version.json#L22), [`schemas/entities/route-version-checkpoint.json:20,25`](schemas/entities/route-version-checkpoint.json#L20); tömbök: [`schemas/api/sync-push.response.json:93`](schemas/api/sync-push.response.json#L93) (`media_missing`), [`schemas/api/user-create.request.json:46`](schemas/api/user-create.request.json#L46) és [`schemas/entities/user.json`](schemas/entities/user.json) `site_ids`.
- **Leírás:** A felsorolt egészeknek nincs `maximum`-a. Kipróbálva: `1e300` mindkét validátorban (Ajv és opis) érvényes `integer`. A PHP ezt floatként dekódolja, az adatbázis `int` oszlopába nem fér. A tömbök elemszáma korlátlan (a `start_times` és a `flags` az `uniqueItems` + véges értékkészlet miatt valójában korlátos, ezért azok nem hibák).
- **Miért probléma?** A CLAUDE.md és a `decisions.md:74-79` a 32 bites oszlophoz igazítja a többi egészet; ezek kimaradtak.
- **Következmény:** Egy hibás vagy rosszindulatú kérés 500-at okoz 422 helyett.
- **Javítás:** `maximum: 2147483647` (vagy ésszerű tartomány, pl. 86 400 s) az egészekre; `maxItems` a `site_ids`-re és a `media_missing`-re.
- **Bizonyosság:** bizonyított (validátorszinten); az 500-as választ nem idéztem elő.
- **Követelmény / terület:** B, L.

### SCH-016 – A `media` egyedisége objektumra, nem azonosítóra vonatkozik

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/chain/payload-scan.json:153-157`](schemas/chain/payload-scan.json#L153-L157), [`schemas/chain/payload-incident.json:101-105`](schemas/chain/payload-incident.json#L101-L105).
- **Leírás:** Az `uniqueItems` az egész `{id, sha256}` objektumra vonatkozik, így ugyanaz a fotóazonosító kétszer, két különböző lenyomattal érvényes (kipróbálva). JSON Schemában ez nem fejezhető ki teljesen; a backend ellenőrzi-e, nem vizsgáltam.
- **Miért probléma?** A hash-elt láncba két ellentmondó lenyomat kerülhet ugyanarra a fotóra, és ez a bejegyzés elfogadása után nem javítható.
- **Következmény:** A fotóellenőrzés (`PUT /media/{id}`) az egyik lenyomattal mindig elbukik; a jelentés hamis cserét mutathat.
- **Javítás:** A szabály legyen a `description`-ben és a `decisions.md`-ben (az app és a backend ellenőrzi), és kerüljön érvénytelen példa a `payload-scan`/`payload-incident` alá „csak backend-ellenőrzés” megjegyzéssel, vagy egy backend-tesztbe.
- **Bizonyosság:** bizonyított (sémaszinten).
- **Követelmény / terület:** D, L.

### SCH-017 – A `schedule` entitás leírása szerint `interval_to = interval_from` érvényes éjféli ablak

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/entities/schedule.json:5`](schemas/entities/schedule.json#L5) („if interval_to <= interval_from the window crosses midnight”); ellentétben: [`schemas/api/schedule-create.request.json:5`](schemas/api/schedule-create.request.json#L5) („interval_from = interval_to is not allowed”), [`schedule/test-vectors.json:3`](schedule/test-vectors.json#L3) (`rules`: „interval_to = interval_from is invalid”), [`docs/decisions.md:257`](docs/decisions.md#L257). A specifikáció (`…specifikáció (1. lépcső).md:368`) `≤`-t ír.
- **Leírás:** A döntés szerint az egyenlőség érvénytelen (ez dokumentált eltérés a specifikációtól), az entitás leírása viszont a specifikáció szövegét ismétli. Maga a séma egyiket sem kényszeríti ki.
- **Miért probléma?** A leírásból generált TS-dokumentáció (`types/index.d.ts`) a fejlesztőnek az ellenkezőjét mondja, mint a vektorok.
- **Következmény:** Egy új implementáció 24 órás ablakként bontja ki az egyenlő határú menetrendet.
- **Javítás:** Az entitás leírása: „if interval_to < interval_from …; interval_to = interval_from is invalid (rejected by the server)”. A specifikáció *Nyitott kérdések* / javítási listájára felvenni.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** B, E, O.

### SCH-018 – A `format` kulcsszó az Ajv és az opis között eltér; az opis-paritást semmi nem ellenőrzi folyamatosan

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/api/auth-login.request.json`](schemas/api/auth-login.request.json), [`schemas/api/user-create.request.json`](schemas/api/user-create.request.json), [`schemas/api/user-update.request.json`](schemas/api/user-update.request.json), [`schemas/api/auth-login.response.json`](schemas/api/auth-login.response.json) (`format: email`); [`schemas/entities/report.json:59-64`](schemas/entities/report.json#L59-L64) (`format: uri`); [`docs/decisions.md:305`](docs/decisions.md#L305) (egyszeri, 326 példás próba); a backend csak a kérés-példákat futtatja opis-szal (`../laravel-waypost/tests/Feature/Api/SchemaValidationTest.php:117-136`).
- **Leírás:** Az audit során mind az 534 példát lefuttattam a backend opis/json-schema **2.6.0**-jával (PHP 8.4.27): mindegyik ugyanúgy dönt, mint az Ajv. Egy 25 elemű differenciális próbában viszont egy eltérés jött elő: `a@[127.0.0.1]` az opis szerint érvényes e-mail, az Ajv szerint nem. A repóban nincs automatikus opis-paritás teszt; a `decisions.md:305` egy korábbi, 326 példás kézi próbára hivatkozik.
- **Miért probléma?** A `format` implementációfüggő; a paritás most véletlenül teljes a példákon, de új példák vagy opis-frissítés mellett csendben elcsúszhat.
- **Következmény:** A backend elfogad egy supervisor-címet, amelyet az app `__DEV__`-ben a login-válaszban elutasít; nagyobb kockázat egy jövőbeli `format`-nál.
- **Javítás:** CI-lépés (SCH-001): minden példa opis-szal is; a differenciális próbák (záró sortörés, IDN, domain-literál, szökőnap) érvénytelen/érvényes példaként. Az e-mailre `pattern` a `format` mellett, ha a két oldal egyezése fontos.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** H, N.

### SCH-019 – Elavult számok és állítások a `docs/decisions.md`-ben

- **Súlyosság:** LOW
- **Érintett fájlok:** [`docs/decisions.md:277`](docs/decisions.md#L277) („mind a 75 kör” – ma 79), [`docs/decisions.md:290`](docs/decisions.md#L290) („mind a 97 érvényes példát” – ma 180), [`docs/decisions.md:305`](docs/decisions.md#L305) („mind a 326 példa” – ma 534), [`docs/decisions.md:306`](docs/decisions.md#L306) („a Composer a git tagből olvassa” – a path-telepítés `dev-main`-t ad), [`docs/decisions.md:77`](docs/decisions.md#L77) és `:223` (lásd SCH-003).
- **Leírás:** A döntésnapló a 0.1.0 állapotát rögzíti, a számok és egy állítás azóta nem igazak.
- **Miért probléma?** A döntésnapló a szerződés része; elavult állítás hamis biztonságérzetet ad (pl. „mind ellenőrizve PHP-val”).
- **Következmény:** Félrevezető dokumentáció.
- **Javítás:** A számokat „a teljes példakészlet” megfogalmazásra cserélni, vagy dátummal ellátni; a Composer-verzió állítását javítani.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** O.

### SCH-020 – A jelentés letöltési URL-je `http://` is lehet

- **Súlyosság:** LOW
- **Érintett fájlok:** [`schemas/entities/report.json:63`](schemas/entities/report.json#L63) (`"pattern": "^https?://"`).
- **Leírás:** Az aláírt, token nélküli letöltési URL titkosítatlan `http://` is lehet (kipróbálva: érvényes).
- **Miért probléma?** Az URL maga a jogosultság (nem kell hozzá token); HTTP-n lehallgatható. Fejlesztői környezetben a `http` kényelmes, de a szerződés ezt nem különíti el.
- **Következmény:** Egy rosszul konfigurált gazda-alkalmazás titkosítatlan, továbbítható letöltési linket ad ki.
- **Javítás:** `^https://`, vagy a leírás rögzítse, hogy `http` csak helyi fejlesztésben megengedett, és a backend élesben kényszerítse.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** L.

### SCH-021 – A `validate.js` nem ellenőrzi, miért bukik el egy érvénytelen példa

- **Súlyosság:** LOW
- **Érintett fájlok:** [`scripts/validate.js:145-154`](scripts/validate.js#L145-L154).
- **Leírás:** Az ellenőrzés csak azt nézi, hogy az érvénytelen példa elbukik-e. A CLAUDE.md szerint a szándékolt okot kézzel kell ellenőrizni (`--verbose`). Az audit során mind a 354 érvénytelen példa hibáit gépileg kigyűjtöttem: mindegyik a fájlnevében megnevezett okból bukik el (a többes hibák az `anyOf`/`null`-ág zajából vagy a dokumentáltan szó szerinti specifikációs példából jönnek) – ma tehát nincs hibás példa.
- **Miért probléma?** Egy séma módosítása után egy érvénytelen példa más okból is elbukhat, és a teszt zöld marad, miközben a szándékolt szabály már nincs ellenőrizve.
- **Következmény:** Csendben elveszett szabályok.
- **Javítás:** Opcionális kísérőfájl vagy fájlnévkonvenció a várt hibára (pl. `examples/.../invalid/<név>.json` mellett `<név>.expect.json`: `{ "instancePath": "/tag_uid", "keyword": "pattern" }`), és ennek gépi ellenőrzése.
- **Bizonyosság:** bizonyított.
- **Követelmény / terület:** F, N.

---

## INFO

### SCH-022 – A `push-final` elfogad üres, `done: false` kérést

- **Súlyosság:** INFO
- **Érintett fájlok:** [`schemas/api/sync-push-final.request.json:16-27`](schemas/api/sync-push-final.request.json#L16-L27).
- **Leírás:** `entries: []` csak a lezáró kérésben értelmes; `done: false` mellett üres köteg is érvényes (kipróbálva). Nem árt, de semmit nem csinál.
- **Javítás:** `if done = false then entries.minItems = 1` (minor szigorítás).
- **Bizonyosság:** bizonyított. **Terület:** C.

### SCH-023 – A 6 jegyű PIN offline ellenőrzője kinyerés után gyorsan törhető

- **Súlyosság:** INFO (a specifikáció döntése, nem sémahiba)
- **Érintett fájlok:** [`schemas/entities/user.json`](schemas/entities/user.json) (`pin_hash`, `pin_salt`, `pin_iterations ≥ 100 000`); specifikáció *PIN-kód*.
- **Leírás:** 10⁶ lehetséges PIN × 100 000 iteráció egy GPU-n percek alatt végigpróbálható, ha valaki a telephelyi telefon adatbázisát kinyeri. A séma a specifikációt pontosan követi; a PIN azonosítóként is szolgál, így a kinyert PIN egy másik őr nevében való belépést tesz lehetővé.
- **Javítás:** Nem a sémában: kockázatként a specifikáció *Nyitott kérdései* közé (pl. eszközhöz kötött titokkal kevert só, vagy a lánc HMAC-jére építő utólagos ellenőrzés).
- **Bizonyosság:** feltételezés (fenyegetésmodell). **Terület:** L.

### SCH-024 – Az `X-Acting-User` bizalmi határa nincs a szerződésben

- **Súlyosság:** INFO
- **Érintett fájlok:** a CRUD-kérések `description`-jei (pl. [`schemas/api/checkpoint-create.request.json:5`](schemas/api/checkpoint-create.request.json#L5)).
- **Leírás:** A szerver az eszköztoken birtokosának állítására fogadja el, hogy egy supervisor PIN-nel belépett. Ez a specifikáció döntése; a fejléc formátuma (UUID) és az, hogy minden supervisor-művelet a telefon tokenjével bárki által indítható, aki a tokent birtokolja, a sémákban csak szövegesen szerepel.
- **Javítás:** A fejlécek közös leírása (SCH-006/SCH-007 keretében), és a kockázat rögzítése a döntésnaplóban.
- **Bizonyosság:** bizonyított (leírások). **Terület:** L.

### SCH-025 – A láncbejegyzésnek nincs formátumverziója

- **Súlyosság:** INFO
- **Érintett fájlok:** [`schemas/chain/entry.json`](schemas/chain/entry.json).
- **Leírás:** Ha a kanonizálás vagy a HMAC-bemenet valaha változik, egy bejegyzésből nem derül ki, melyik szabállyal készült. Az adatmegőrzés rövid (31–62 nap), ezért ez ma kis kockázat.
- **Javítás:** Döntés a `decisions.md`-ben: verzióváltás új mező (pl. `v`) vagy új bejegyzéstípus révén; addig semmi teendő.
- **Bizonyosság:** feltételezés. **Terület:** D, 4.

### SCH-026 – A menetrend-vektorok nem rögzítik a tzdata verzióját

- **Súlyosság:** INFO
- **Érintett fájlok:** [`scripts/schedule-vectors.js:19-34`](scripts/schedule-vectors.js#L19-L34) (`Intl.DateTimeFormat`), [`schedule/test-vectors.json`](schedule/test-vectors.json).
- **Leírás:** A generátor a futtató Node ICU-adatbázisát használja, a PHP a saját timezonedb-jét, a telefon az operációs rendszerét. Egy tzdata-változás a `--check` tesztet a gépek között eltérővé teheti, és a vektorfájlból nem derül ki, melyik tzdata-val készült.
- **Javítás:** `tzdata` mező a vektorfájlban (`process.versions.tz`), és a teszt figyelmeztessen eltérésnél.
- **Bizonyosság:** bizonyított (forrás). **Terület:** E, M.

### SCH-027 – `Paths::schemaNames()` csak egy könyvtárszintet lát

- **Súlyosság:** INFO
- **Érintett fájlok:** [`src/Paths.php:79`](src/Paths.php#L79) (`glob($prefix . '*/*.json')`).
- **Leírás:** Egy későbbi `schemas/v2/api/...` szerkezet (SCH-008) sémái csendben kimaradnának a listából; a `NAME_PATTERN` (`:21`) is pontosan két szintet enged.
- **Javítás:** Rekurzív bejárás, vagy a szerkezet változásakor a minta és a teszt együttes módosítása.
- **Bizonyosság:** bizonyított. **Terület:** H, M.

### SCH-028 – Az app outboxa sémaútvonalakat tárol tartósan

- **Súlyosság:** INFO
- **Érintett fájlok:** `../waypost/src/sync/outbox.ts:82` (`body_schema`), `../waypost/src/api/config-calls.ts`.
- **Leírás:** A sorban álló kérések a sémaútvonalat (`api/site-create.request`) és a kor szerinti törzset tárolják; egy app-frissítés után ezek az új sémával mennek ki. Egy séma átnevezése vagy szigorítása így a már sorban álló kéréseket érinti.
- **Javítás:** A CHANGELOG kompatibilitási szabályába (SCH-008): sémaútvonal nem nevezhető át minor verzióban.
- **Bizonyosság:** bizonyított (forrás). **Terület:** J, K.

### SCH-029 – A `validation_failed` `details` nélkül is érvényes

- **Súlyosság:** INFO (dokumentált döntés)
- **Érintett fájlok:** [`schemas/api/error.json:20`](schemas/api/error.json#L20); [`docs/decisions.md:53-58`](docs/decisions.md#L53-L58).
- **Leírás:** A döntés szerint `validation_failed` esetén kötelező a `details`, a séma ezt szándékosan nem kényszeríti (a TS-típus egyszerűsége miatt). Kipróbálva: `details` nélkül érvényes.
- **Javítás:** Egy `if/then` ág nem változtatna a típuson (a generátor a feltételes ágat eldobja), így a kikényszerítés költség nélkül megoldható.
- **Bizonyosság:** bizonyított. **Terület:** C.

### SCH-030 – A backend olyan letöltő végpontokat nyújt, amelyek a szerződésben nem szerepelnek

- **Súlyosság:** INFO
- **Érintett fájlok:** `../laravel-waypost/routes/api.php` (`GET media/{media}/file`, `GET reports/{report}/file`); [`docs/decisions.md:359-369`](docs/decisions.md#L359) („ebben a lépcsőben nincs végpont a fotó letöltésére”).
- **Leírás:** Bináris, aláírt URL-es végpontok (a jelentések bélyegképeihez és PDF-jeihez); JSON-törzsük nincs, de a hibaválaszuk, a státuszkódjaik és a létezésük sincs a szerződésben, és a döntésnapló állítása a fotóletöltésről pontosítandó.
- **Javítás:** Felvétel a végponttáblába (SCH-006), a döntés pontosítása.
- **Bizonyosság:** bizonyított. **Terület:** C, K.

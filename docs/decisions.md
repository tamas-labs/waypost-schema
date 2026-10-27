# Döntések

Ami a fejlesztői specifikációban nincs eldöntve, az ide kerül. Egy bejegyzés: dátum, kérdés, döntés, indok. A legújabb kerül alulra.

<!--
## ÉÉÉÉ-HH-NN – Rövid cím

- **Kérdés:**
- **Döntés:**
- **Indok:**
- **Érintett:** (séma, tesztvektor, feladat azonosító, pl. M0-08, Q5)
-->

## 2026-10-27 – A sémák `$id`-ja

- **Kérdés:** Milyen `$id`-t kapjanak a sémák, hogy a fájlok közötti `$ref`-ek az Ajv-ben (app) és az opis/json-schema-ban (backend) is ugyanúgy feloldódjanak?
- **Döntés:** `$id` = `https://waypost.dev/schema/<útvonal a schemas/ alatt>`, pl. `https://waypost.dev/schema/entities/site.json`. A sémák egymásra relatív `$ref`-fel hivatkoznak (`../common/uuid.json`). A `scripts/validate.js` ellenőrzi, hogy az `$id` megegyezik a fájl útvonalával.
- **Indok:** A relatív `$ref` feloldásához abszolút alap-URI kell. Az URI csak azonosító, a hálózatról soha nem töltődik le: az Ajv-be minden séma előre be van töltve, az opis-ban a prefix egy könyvtárra képezhető le (`registerPrefix`). Ha később saját domain lesz, egy helyen cserélhető (major verzió nélkül, ha a fogyasztók még nem hivatkoznak rá közvetlenül – 0.x alatt ez megengedett).
- **Érintett:** minden séma; M0-02, M0-10, M2-11.

## 2026-10-27 – A példák helye és a kötelező példák

- **Kérdés:** Hogyan kapcsolódik egy példa a sémájához, és mi a teendő, ha egy sémához nincs példa?
- **Döntés:** `examples/<séma útvonala .json nélkül>/valid/<név>.json` és `.../invalid/<név>.json`, pl. `examples/entities/site/valid/minimal.json` → `schemas/entities/site.json`. Minden sémához legalább egy érvényes és egy érvénytelen példa kötelező, ennek hiánya hiba. Más elrendezésű vagy más kiterjesztésű fájl az `examples/` és a `schemas/` alatt hiba.
- **Indok:** Egyértelmű, konfiguráció nélküli megfeleltetés; semmi nem marad csendben ellenőrizetlenül. Ebből következik, hogy a közös definíciók (M0-03) külön sémafájlokba kerülnek (pl. `schemas/common/uuid.json`), mert így mindegyikhez lehet saját példa.
- **Érintett:** M0-02, M0-03 és minden további séma.

## 2026-10-27 – Ajv szigorú mód

- **Kérdés:** Mennyire szigorúan fordítsa az Ajv a sémákat?
- **Döntés:** `strict: true` (ismeretlen kulcsszó, típusellentmondás, hiányos tuple hiba), `allErrors: true`, `ajv-formats` betöltve; a `strictRequired` ki van kapcsolva, mert `allOf`-os összetételnél fölösleges hibát adna.
- **Indok:** Az elgépelt kulcsszót (pl. `patern`) az Ajv különben csendben figyelmen kívül hagyná, és a séma a vártnál engedékenyebb lenne – ez a backend és az app közötti eltérés legalattomosabb forrása.
- **Érintett:** M0-02, M3-04 (az app `__DEV__` ellenőrzése ugyanezekkel a beállításokkal fusson).

## 2026-10-27 – Közös típusok szöveges alakja (UUID, időbélyeg, lenyomat, base64)

- **Kérdés:** Mennyire engedékeny legyen a közös típusok szöveges alakja?
- **Döntés:** Mindegyiknek pontosan egy elfogadott alakja van:
  - UUID: csak 7-es verzió, RFC 9562 változat (`8`–`b`), **csak kisbetűvel**, kötőjelekkel;
  - időbélyeg: `ÉÉÉÉ-HH-NNTÓÓ:PP:MM.mmmZ` – pontosan 3 tizedesjegy, csak `Z` (eltolás nem), szökőmásodperc nincs; a `pattern` mellett `format: date-time` is, hogy a nem létező dátum (február 30.) is elbukjon;
  - lenyomat: 64 kisbetűs hex karakter, előtag nélkül;
  - base64: szabványos ábécé (RFC 4648 4. szakasz), kötelező `=` kitöltéssel, sortörés nélkül, nem üres.
- **Indok:** Ezek az értékek bekerülnek a HMAC-kal védett láncbejegyzésekbe és az adatbázis egyedi kulcsaiba; két különböző szöveges alak ugyanarra az értékre eltérő lenyomatot vagy ütközést okozna. A PHP (`base64_encode`, `Str::uuid7()`, `hash()`) és a JS (`Buffer`, `toISOString()`) alapértelmezett kimenete éppen ez az alak. A `format` ellenőrzéséhez a fogyasztónak be kell kapcsolnia a formátumellenőrzést (Ajv: `ajv-formats`; opis: alapból be van kapcsolva).
- **Érintett:** M0-03, M3-02, M3-04, M2-02, M2-11.

## 2026-10-27 – `server_time` a hibaválaszban is

- **Kérdés:** A specifikáció hibaformátum-példájában nincs `server_time`, de az API-szerződés szerint „minden válasz tartalmazza”. Melyik az érvényes?
- **Döntés:** A hibaválaszban is kötelező: `{ "server_time": "...", "error": { "code", "message", "details"? } }`.
- **Indok:** Az általános szabály erősebb a példánál; az app a hibaválaszból (pl. `device_revoked`) is frissítheti a megbízható időt, és a backend egy middleware-rel minden válaszba beteheti (M2-10).
- **Érintett:** `api/error.json`, M2-10.

## 2026-10-27 – A hibaválasz `details` mezője

- **Kérdés:** Mi a `details` pontos alakja?
- **Döntés:** Nem üres objektum; kulcs a hibás mező pontokkal elválasztott útvonala (pl. `entries.3.seq`), érték nem üres, magyar nyelvű üzenetekből álló tömb. `validation_failed` esetén kötelezően jelen van, a többi kódnál elhagyható. A séma ezt nem kényszeríti ki kódonként, mert a feltételes ág csak bonyolítaná a generált TS típust.
- **Indok:** Ez a Laravel validációs hibáinak alakja (`$validator->errors()->toArray()`), így a backendnek nem kell átalakítania; az app a kulcs alapján a megfelelő mező alá írhatja az üzenetet.
- **Érintett:** `api/error.json`, M2-10, M2-11, M3-04.

## 2026-10-27 – Egy közös hibakód-lista

- **Kérdés:** A kérésszintű (HTTP) és a bejegyzésszintű (`chain_gap`, `chain_fork`, `bad_hmac`) hibakód külön felsorolás legyen?
- **Döntés:** Egy felsorolás (`common/error-code.json`), ahogy a specifikáció is egy listában adja meg. A push válaszának `rejected[].code` mezője (M0-06) ennek a részhalmazát engedi meg.
- **Indok:** Egy helyen bővíthető; az app egyetlen típussal kezeli a hibakódokat.
- **Érintett:** `common/error-code.json`, `api/error.json`, M0-06.

## 2026-10-27 – Ismeretlen mezők: `additionalProperties: false`

- **Kérdés:** Elfogadja-e egy séma a benne nem leírt mezőket?
- **Döntés:** Nem: minden objektumséma `additionalProperties: false` (kérésben és válaszban is). Új mező = új (minor) sémaverzió, előbb itt, aztán a backendben és az appban – ahogy a specifikáció előírja.
- **Indok:** Az elgépelt vagy véletlenül kiszivárgó mező (pl. `password`, `email` a pull-válaszban) így azonnal kiderül a backend sématesztjeiben és az app fejlesztői ellenőrzésében.
- **Érintett:** minden objektumséma.

## 2026-10-27 – Egész számok és a `1.0` alak

- **Kérdés:** A JSON Schema szerint az `1.0` is `integer`, és a JSON-értelmezők (JS `JSON.parse`) nem is különböztetik meg az `1`-től. Elég-e ez a „lebegőpontos szám sehol” szabályhoz?
- **Döntés:** A séma azt garantálja, hogy az érték matematikailag egész; az `47.4979` és a `474979000.5` elbukik. A küldő félnek egészként, tizedesrész nélkül kell kiírnia a számot. Az RFC 8785 kanonikus alakja `1.0`-ra és `1`-re is `1`, így a lenyomatban nincs eltérés. Az `accuracy_dm` felső korlátja 2³¹ − 1, a koordináták a fok × 10⁷ tartományában maradnak, így mindhárom elfér egy 32 bites egész oszlopban.
- **Indok:** Nyers JSON-szöveg szintű ellenőrzés egyik oldalon sem kell; a valódi kockázat (lebegőpontos érték a hash-elt adatban) a sémával kiszűrhető.
- **Érintett:** `common/lat-e7.json`, `common/lng-e7.json`, `common/accuracy-dm.json`, M0-05, M0-07.

## 2026-10-27 – Mit ír le egy entitásséma?

- **Kérdés:** Az entitássémák az adatbázis-táblát vagy a hálózaton utazó alakot írják le? Mi a teendő a hiányzó értékekkel?
- **Döntés:** A hálózati alakot (pull `changes`, később a CRUD-válaszok). Minden mező kötelezően jelen van, a hiányzó érték `null` – mint a láncbejegyzésben. A csak szerveroldali mezők soha nem szerepelnek: `users.email`, `users.password`, `devices.secret`, `devices.last_seq`, `devices.last_hash`, `deleted_at` (a törlés a pull `deleted` listájában jelenik meg). A `created_at` / `updated_at` ott van, ahol a táblának is van időbélyege; a `devices` és a `report_subscriptions` táblának nincs.
- **Indok:** Egy alak, amelyből a TS típusok (`T | null`, nem opcionális mező) egyértelműek; a kiszivárgó titkot az `additionalProperties: false` azonnal elkapja.
- **Érintett:** `schemas/entities/*`, M0-06, M2-23, M3-01.

## 2026-10-27 – A pont helye egész számokkal

- **Kérdés:** A specifikáció adatmodelljében a `checkpoints` tábla `lat decimal`, `lng decimal`, `accuracy_m float` mezőkkel szerepel, miközben a hash-elt adatban nem lehet lebegőpontos szám.
- **Döntés:** A `checkpoint` entitásban `lat_e7`, `lng_e7`, `accuracy_dm` egész szám, mint a láncban. Mind null lehet (a betanításkor a helymeghatározás 5 mp után feladja); `lat_e7` és `lng_e7` együtt van vagy együtt hiányzik, `accuracy_dm` csak hellyel együtt. A backend javasolt oszlopai is egészek (`lat_e7 int`, `lng_e7 int`, `accuracy_dm int`).
- **Indok:** Egyféle helyábrázolás az egész rendszerben; a `far_from_checkpoint` jelölés (M4-06) a lánc és a pont koordinátáit így átváltás és kerekítési eltérés nélkül hasonlítja össze.
- **Érintett:** `entities/checkpoint.json`, M2-03 (migráció), M4-06, M5-11.

## 2026-10-27 – NFC UID és QR payload formátuma

- **Kérdés:** Milyen hosszú lehet a `tag_uid`, mi a QR payload 16 karakteres kódjának ábécéje, és lehet-e egy NFC-pontnak QR-kódja?
- **Döntés:**
  - `tag_uid`: nagybetűs hex, elválasztó nélkül, 4–10 bájt (8–20 páros számú karakter) – ISO 14443 (4, 7, 10 bájt) és ISO 15693 (8 bájt) is belefér.
  - QR payload: `waypost:cp:<checkpoint id, kisbetűs UUIDv7>:<16 karakter [A-Za-z0-9]>`. Hogy az UUID a pont saját ID-ja, azt a séma nem tudja ellenőrizni – a backend ellenőrzi (M2-18).
  - `nfc` / `nfc_dna` pontnál a `tag_uid`, `qr` pontnál a `qr_payload` kötelező; a másik mező bármelyik típusnál kitölthető (pl. tartalék QR-matrica egy NFC-ponton).
- **Indok:** A 62 karakteres ábécé 16 jeggyel ~95 bit véletlen, és nincs benne olyan jel, amelyet a QR-olvasók vagy az URL-ek másként kezelnének.
- **Érintett:** `entities/checkpoint.json`, M1-04, M1-05, M2-18, M3-18.

## 2026-10-27 – A felhasználó a pullban (`site_ids`, PIN-mezők)

- **Kérdés:** Honnan tudja a supervisor saját telefonja, melyik őr melyik telephelyhez tartozik? Mi van a PIN-mezőkkel, ha a felhasználónak nincs PIN-je, vagy a címzett nem kaphatja meg (Q9)?
- **Döntés:**
  - A `user` entitás `site_ids` tömböt kap (a `site_user` táblából, a címzett által látható telephelyekre szűrve). Egy hozzárendelés változásakor a felhasználó `updated_at`-je is frissül, hogy az inkrementális pull elhozza.
  - `pin_hash` (32 bájt), `pin_salt` (16 bájt), `pin_iterations` (≥ 100 000): vagy mind a három ki van töltve, vagy mind a három `null`. `null`, ha a felhasználónak nincs PIN-je (pl. a `waypost:create-supervisor` paranccsal létrehozott supervisor), vagy ha a címzett nem kaphatja meg. A supervisorok is kaphatnak PIN-t (a telephelyi telefonon supervisor módba lépéshez).
  - A Q9 tényleges döntése (a supervisor saját telefonja kap-e PIN-hasheket) az M2-23-ban születik; a séma mindkét változatot megengedi.
- **Indok:** Külön `site_users` lista helyett egyetlen mező; a PIN-mezők mindent-vagy-semmit szabálya kizárja a félig kitöltött, használhatatlan ellenőrzőt.
- **Érintett:** `entities/user.json`, M2-09, M2-17, M2-23, M3-15, Q9, Q11.

## 2026-10-27 – Útvonalverzió-pontok és menetrend részletei

- **Kérdés:** A `position` 0-tól vagy 1-től indul? Mit enged a menetrend sémája?
- **Döntés:**
  - `position` és `version` 1-től indul. A `route_version_checkpoint`-nak nincs saját ID-ja (a kulcs `route_version_id` + `position`); a verzióval együtt változatlan, ezért a pull `deleted` listájában sem kell szerepelnie.
  - Menetrend: a másik mód mezői `null`-ok; `list` módban legalább egy, egyedi `HH:MM` időpont; `interval` módban `interval_from`, `interval_to`, `interval_every_min` kötelező. A `weekdays` 1–127. Hogy az `interval_from` ≠ `interval_to`, és hogy a `list` időpontjai milyen sorrendben állnak, azt a séma nem ellenőrzi (a jelentésüket az M0-08 menetrend-tesztvektorai rögzítik).
  - Korlátok: `interval_every_min`, `time_limit_min` és `no_data_alert_after_min` 1–1440 perc; név 255, cím 255, utasítás 2000, `app_version` 50 karakter; az időzóna IANA-név mintával.
- **Indok:** A korlátok az adatbázis-oszlopokhoz (`varchar(255)`) és a józan észhez igazodnak; ha szűknek bizonyulnak, egy minor verzióval bővíthetők.
- **Érintett:** `entities/route-version*.json`, `entities/schedule.json`, `entities/site.json`, `entities/device.json`, M0-08, M2-19, M2-20.

## 2026-10-27 – A küldött láncbejegyzés alakja és a HMAC bemenete

- **Kérdés:** A specifikáció hash-elt `entry` objektumában szerepel a `device_id`, a push-példa bejegyzéseiben viszont nincs, és ott a `hash` is a bejegyzésen belül van. Mi pontosan a HMAC bemenete?
- **Döntés:** A `chain/entry.json` a küldött és tárolt bejegyzés: a specifikáció `entry` mezői (a `device_id`-vel együtt) + `hash`. A HMAC bemenete: `canonical_json(bejegyzés a "hash" mező nélkül)`. Más mező (pl. az app `synced_at`-je vagy a szerver `flags`, `verify_status`, `received_at` mezője) nem kerülhet a küldött bejegyzésbe.
- **Indok:** A szerver a kapott objektumból a `hash` elhagyásával közvetlenül újraszámolhatja a HMAC-ot, semmit nem kell visszaillesztenie; a `device_id` a bejegyzésben marad, így egy bejegyzés másik eszköz nevében nem játszható vissza. A push kérés `device_id`-jének egyeznie kell az eszköztokennel és minden bejegyzés `device_id`-jével (backend-ellenőrzés, M4-03).
- **Érintett:** `chain/entry.json`, M0-06, M0-07, M3-11, M4-02, M4-03.

## 2026-10-27 – `media` a `media_ids` helyett

- **Kérdés:** A specifikáció szerint a `scan` és az `incident` payloadban a `media_ids[]` mellett `media: [{id, sha256}]` is van. Kell-e mindkettő?
- **Döntés:** Csak a `media: [{id, sha256}]` van; a `media_ids` megszűnik (a lista a `media[].id`-ből adódik). Legfeljebb 5 fotó, mindkét payloadban; kézi rögzítésnél legalább 1.
- **Indok:** Ugyanaz az ID-lista kétszer szerepelne a hash-elt adatban, és a kettő egyezését a séma nem tudja ellenőrizni – egy eltérés csak zavart okozna.
- **Érintett:** `chain/payload-scan.json`, `chain/payload-incident.json`, M0-06 (a push-példa `media_ids` mezője), M3-12, M4-05, M4-07.

## 2026-10-27 – A bejegyzéstípus bővítése

- **Kérdés:** Hogyan legyen a `type` „bővíthető” (2. lépcső: `sos`)?
- **Döntés:** A sémában zárt felsorolás (a mai hat típus); a típusonkénti payloadot egy-egy `if/then` ág köti a `type`-hoz. Új típus = új enum-érték + új `payload-<type>.json` + új ág, minor verzióban, előbb itt, aztán a backendben, végül az appban. Az adatbázisban a `type` szöveges oszlop (Q14), így ott nem kell migráció.
- **Indok:** A zárt felsorolás miatt egy elgépelt vagy ismeretlen típus nem kerülhet a láncba; a bővítés mégis egyetlen, visszafelé kompatibilis lépés.
- **Érintett:** `chain/entry.json`, M0-09 (a TS típusnál a `type` és a `payload` összekapcsolását kézzel kell megoldani, mert a generátor az `if/then`-t nem ismeri), M2-04, Q14.

## 2026-10-27 – Láncbejegyzés: egész számok, `boot_id`, szinkronreferencia

- **Kérdés:** Mekkora egész számok lehetnek a láncban, milyen a `boot_id`, és milyen összefüggések kötelezők a mezők között?
- **Döntés:**
  - Minden egész szám ±(2⁵³ − 1) között van (`seq`, `uptime_ms`, `ref_uptime_ms`) – ezt az RFC 8785 és a JS `number` is pontosan ábrázolja.
  - `boot_id`: átlátszatlan szöveg, `[A-Za-z0-9._:-]{1,64}`; az előállítását a `waypost-clock` modul (M1-03) adja.
  - `ref_server_time`, `ref_uptime_ms`, `ref_boot_id`: vagy mind a három ki van töltve, vagy mind `null` (az első szinkron előtt).
  - `seq = 1` esetén a `prev_hash` 64 db `0`.
- **Indok:** A hiányos szinkronreferenciából a szerver nem tud időt becsülni (`time_suspect`), ezért már a séma kiszűri.
- **Érintett:** `chain/entry.json`, M0-07, M1-03, M3-02, M4-06.

## 2026-10-27 – A `scan` payload belső szabályai

- **Kérdés:** Mennyit ellenőrizzen a séma a leolvasás mezői közötti összefüggésekből?
- **Döntés:** Amit a mezőkből egyértelműen el lehet dönteni:
  - `nfc`: van `tag_uid`, nincs `qr_payload`; `qr`: van `qr_payload`, nincs `tag_uid` és `ndef_raw`; `manual`: nincs címkeadat, van `checkpoint_id`, megjegyzés, legalább egy fotó és `manual` jelölés – és a `manual` jelölés csak kézi rögzítésnél állhat.
  - `unknown_tag` jelölés pontosan akkor, ha `checkpoint_id = null`; `mock_location` pontosan akkor, ha `is_mock = true`; `out_of_round` jelölésnél `round_id = null`.
  - A helyadat (`lat_e7`, `lng_e7`, `accuracy_dm`) mindent-vagy-semmit, mint a pontnál.
  - A `scan.qr_payload` csak a `waypost:cp:` előtagot követeli meg (legfeljebb 255 karakter), mert az ismeretlen kódot is rögzíteni kell (`unknown_tag`).
  - A szerveroldali jelölések (`time_suspect`, `too_fast`, `far_from_checkpoint`, `late_sync`) nem kerülhetnek a payloadba; a szerver a saját `chain_entries.flags` mezőjében tárolja őket.
  - Az `out_of_order` és az `out_of_round` helyességét (a várt pont, a kör útvonala) a séma nem tudja ellenőrizni – ez a domain (M3-18) dolga.
- **Indok:** Az app hibáját már a fejlesztői ellenőrzés (`__DEV__`) és a backend sémaellenőrzése is elkapja, mielőtt az a hash-elt, már nem javítható láncba kerülne.
- **Érintett:** `chain/payload-scan.json`, M3-12, M3-18, M3-19, M4-06.

## 2026-10-27 – A példák `hash` mezői

- **Kérdés:** A `chain/entry` példáiban valódi HMAC legyen?
- **Döntés:** Nem: az `examples/chain/entry/` alatti `prev_hash` és `hash` értékek formailag helyes helyőrzők. A valódi, kulccsal számolt bejegyzések a `chain/test-vectors.json`-ban vannak (M0-07); a lánc- és HMAC-teszteket arra kell építeni.
- **Indok:** A JSON Schema a lenyomat helyességét nem tudja ellenőrizni; a példák a formát tesztelik, a tesztvektorok a számítást.
- **Érintett:** `examples/chain/entry/`, M0-07.

## 2026-10-27 – A specifikáció JSON-példái és a sémák

- **Kérdés:** Az M0-06 elfogadási feltétele, hogy „a specifikáció JSON-példái érvényes példaként validálnak”. A specifikáció példái azonban rövidítettek (`"id": "..."`, `"pin_hash": "base64"`, csonka entitások, a `deleted`-ben csak két lista), így szó szerint semmilyen hasznos séma nem fogadhatja el őket.
- **Döntés:** A specifikáció pull-, push- és push-válasz-példája `spec-example.json` néven érvényes példa lett, ugyanazzal a szerkezettel és értékekkel, de a `"..."` helyén valódi azonosítókkal, teljes entitásokkal, minden listával, és a korábbi döntések szerint (`media` a `media_ids` helyett, `device_id` a bejegyzésben). A pull-példa szó szerinti alakja `examples/api/sync-pull.response/invalid/spec-example-verbatim-abbreviated.json` néven, érvénytelen példaként dokumentálja az eltérést.
- **Indok:** A példák szerkezete és jelentése megmarad, a séma pedig nem lazul fel a rövidítések kedvéért.
- **Érintett:** `examples/api/sync-pull.response/`, `examples/api/sync-push.request/`, `examples/api/sync-push.response/`; a specifikáció API-szerződés szakaszának példái frissítendők.

## 2026-10-27 – A pull válasza

- **Kérdés:** Mely listák szerepelnek a pull `changes` és `deleted` részében, és kötelezők-e?
- **Döntés:**
  - Mindkét objektumban minden lista kötelezően jelen van (esetleg üresen), ismeretlen lista nem lehet.
  - `changes`: a specifikáció hét listája + `devices` (a supervisor a telephely adatlapján látja a hozzárendelt telefont, S3) + `report_subscriptions` (jelentésbeállítások, S10).
  - `deleted`: `sites`, `users`, `devices`, `checkpoints`, `routes`, `schedules`, `report_subscriptions` – azonosítók listája. Ide kerül az is, ami a hívó számára már nem látható (pl. egy őrt leválasztottak a telephelyről). Az útvonalverziók és pontjaik változatlanok és nem törlődnek önállóan, ezért nincs törlési listájuk.
  - Listánként legfeljebb 500 elem; az oldalankénti összesen 500 rekordot a backend biztosítja.
  - A `cursor` mindig nem üres, átlátszatlan szöveg (üres adatbázisnál is), a kliens változatlanul küldi vissza.
- **Indok:** A kliens minden listát feltétel nélkül bejárhat; a két új lista nélkül a supervisor saját telefonja nem tudná megjeleníteni a telephely telefonját és a jelentés-előfizetéseket.
- **Érintett:** `api/sync-pull.response.json`, M2-23, M3-07, M5-08, M5-19, Q3.

## 2026-10-27 – Belépés, kijelentkezés, eszköz-hozzárendelés válaszai

- **Kérdés:** Mit adnak vissza a `POST /auth/login`, `POST /auth/logout` és `POST /devices/enroll` végpontok?
- **Döntés:**
  - Login: `{ server_time, token, user: { id, name, email, role: "supervisor" } }`. A telephelyek a következő pullban jönnek. A token átlátszatlan szöveg (Sanctum).
  - Logout: `200` és `{ server_time }` (nem `204`), mert minden válaszban kötelező a `server_time`.
  - Enroll: `{ server_time, device, token, secret }`, ahol a `device` a teljes `device` entitás, a `secret` 32 bájt base64-ben (44 karakter).
  - A fejlécek (`Authorization`, `Idempotency-Key`) nem részei a törzs-sémáknak; a sémák `description` mezője jelzi, hol kötelezők.
- **Indok:** A legegyszerűbb alak, amely a specifikáció minden kötelező elemét tartalmazza; az entitást nem kell egy külön, csonka alakban újra leírni.
- **Érintett:** `api/auth-*.json`, `api/devices-enroll.*.json`, M2-14, M2-22, M3-06, M5-06, M5-09.

## 2026-10-27 – A push válasza

- **Kérdés:** Milyen alakú a `rejected` lista, és mi a `last_seq`, ha még semmi nem lett elfogadva?
- **Döntés:** `rejected[]`: `{ id, code, expected_seq }`, ahol a `code` csak `chain_gap`, `chain_fork` vagy `bad_hmac` lehet, az `expected_seq` pedig `chain_gap` esetén a szerver által várt `seq`, egyébként `null`. A `last_seq` a szerver utolsó ellenőrzött `seq`-je (még semmi: `0`). Az `accepted` az összes most `ok` állapotú bejegyzés azonosítója, a korábban már elfogadottaké is. Egy köteg 1–200 bejegyzés; ha a kérés maga sémahibás, a válasz `422 validation_failed`, nem bejegyzésenkénti elutasítás.
- **Indok:** A specifikáció példáját követi; a `null` a „minden mező jelen van” elv miatt kell.
- **Érintett:** `api/sync-push.*.json`, M4-03, M4-04, M4-09.

## 2026-10-27 – A kanonikus JSON pontos szabályai (RFC 8785, Waypost-szűkítéssel)

- **Kérdés:** Mit kell pontosan tudnia a `canonical_json`-nak az appban (M3-10) és a backendben (M4-02)?
- **Döntés:** RFC 8785 (JCS) a következő szűkítésekkel – a referencia a `scripts/jcs.js`:
  - szám csak egész lehet, ±(2⁵³ − 1) között; bármi más (lebegőpontos, túl nagy, `NaN`, `Infinity`) kivételt dob;
  - a szövegben magányos surrogate nem lehet (I-JSON); kivétel;
  - a kulcsok UTF-16 kódegységek szerint rendezve, minden szinten; a szöveg pontosan az ECMAScript `JSON.stringify` szerint: csak a `"`, a `\` és az U+0000–U+001F escape-elődik (`\b \t \n \f \r`, egyébként `\u00xx` kisbetűvel); a `/`, a nem ASCII karakterek és az U+2028/U+2029 betű szerint maradnak;
  - a HMAC bemenete a kanonikus szöveg UTF-8 bájtjai.
  - A hash-elt adatban minden kulcs ASCII (`[a-z0-9_]`, ezt a sémák `additionalProperties: false`-a biztosítja), ezért a bájt szerinti rendezés (PHP `ksort(..., SORT_STRING)`) itt egyenértékű a UTF-16 szerintivel.
  - PHP-ban: rekurzív `ksort(SORT_STRING)` a nem-lista tömbökön, majd `json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR)`. Alapértelmezett flagekkel a vektorok közül kettő eltörik (ékezet, `/`, U+2028). Vigyázat: `json_decode(..., true)` után az üres objektum (`{}`) üres tömb lesz, és `[]`-ként íródik ki; a mai sémákban hash-elt üres objektum nem fordulhat elő.
- **Indok:** A JS és a PHP alapértelmezett JSON-kimenete több ponton eltér; ezek a pontok mind szerepelnek a tesztvektorokban. A vektorokat egy független JS-implementáció (`canonicalize`, az RFC társszerzőjétől) és egy PHP-s próba (PHP 8.5, a fenti recepttel) is bájtra azonosan reprodukálja.
- **Érintett:** `scripts/jcs.js`, `chain/test-vectors.json`, M3-10, M3-11, M4-02.

## 2026-10-27 – A lánc-tesztvektorok fájlja

- **Kérdés:** Milyen szerkezetű a `chain/test-vectors.json`, és hogyan marad naprakész?
- **Döntés:**
  - Rögzített teszt-kulcs: a 0x00, 0x01, …, 0x1f bájtok (`key_base64`, `key_hex`) – csak tesztekhez.
  - `cases[]`: `{ name, description, input, canonical_json, hash }`, ahol az `input` a bejegyzés `hash` nélkül, és `input` + `hash` érvényes `chain/entry.json`. Az önálló esetek `prev_hash`-e helyőrző (64 db `a`, az első bejegyzésnél 64 db `0`); valódi láncolás csak a `chain` részben van.
  - `chain.entries[]`: 3 egymást követő bejegyzés (`seq` 1–3), mindegyik `prev_hash`-e az előző `hash`-e, az elsőé 64 db `0`.
  - Az `input` objektumok kulcsai szándékosan nem ábécérendben állnak (a specifikáció sorrendjében, a `key-order-reversed-nested` esetben minden szinten fordítva), így a rendezést minden implementációnak ténylegesen el kell végeznie.
  - A fájlt a `scripts/chain-vectors.js` állítja elő (`npm run vectors:chain`); kézzel nem szerkesztjük. A teszt (`npm test`) ellenőrzi, hogy a fájl bájtra egyezik egy friss futtatás eredményével, és hogy a generátor determinisztikus.
- **Indok:** Egy fájl, amelyből a két másik repó tesztjei közvetlenül olvasnak; a bájtazonosság miatt egy véletlen kézi módosítás vagy egy nem determinisztikus generátor azonnal kiderül.
- **Érintett:** `chain/test-vectors.json`, `scripts/chain-vectors.js`, M3-10, M3-11, M4-02, M0-10 (export).

## 2026-10-27 – Menetrend-kibontás: DST (Q5)

- **Kérdés:** Mi legyen a tavaszi váltáskor nem létező és az őszi váltáskor kétszer előforduló helyi időponttal? Az intervallum lépései faliórás időpontok vagy valós eltelt percek?
- **Döntés (a tasks.md Q5 javaslata, jóváhagyva):**
  - Az intervallum lépései **faliórás** időpontok (20:00, 21:00 … helyi idő szerint), nem valós eltelt percek.
  - A **nem létező** helyi időpont a váltás utáni első érvényes időre kerül: 2026-03-29 02:30 → 03:00 CEST (01:00 UTC), nem 03:30.
  - A **kétszer előforduló** helyi időpontnál az **első** előfordulás számít: 2026-10-25 02:30 → 02:30 CEST (00:30 UTC).
  - Ha egy ablak két időpontja ugyanarra a pillanatra esik (pl. a nem létező 02:00 és a 03:00 lépés), az **egy** kör.
- **Következmény:** a tavaszi éjszakán a 20:00–08:00 óránkénti menetrend 12 kört ad (11 valós óra), az őszin 13-at (13 valós óra, a 02:00 és a 03:00 között 2 valós óra).
- **Vigyázat, a könyvtárak alapviselkedése eltér:** a PHP `DateTime` a kétszer előforduló időpontnál a **második** előfordulást választja (02:30 → 01:30 UTC), a nem létezőt pedig a kiesett órával tolja (02:30 → 03:30 CEST); a JS Temporal `disambiguation: 'compatible'` módja az elsőt választja, de a nem létezőt szintén 03:30-ra tolja. Az M3-13 és az M6-02 implementációjában ezt a két esetet kifejezetten kell kezelni; a `schedule/test-vectors.json` DST-esetei ezt ellenőrzik.
- **Indok:** A faliórás lépés az, amit a supervisor beállít és az őr az órán lát; a „korábbi előfordulás” és a „váltás pillanata” mindkét irányban a lehető legkorábbi kört adja, így kör nem csúszik ki az ablakból.
- **Érintett:** `schedule/test-vectors.json`, M3-13, M3-24, M6-02, M6-03.

## 2026-10-27 – Menetrend-kibontás: a `list` mód és az éjfélen átnyúló ablak

- **Kérdés:** A specifikáció az `interval` módra kimondja, hogy az éjfélen átnyúló ablak a kezdő napjához tartozik, a `list` módra nem. A `["22:00", "00:00", "02:00"]` lista elemei melyik naphoz tartoznak?
- **Döntés:**
  - A lista egy **sorozat** a kezdő naptól: ha egy elem nem későbbi az előzőnél, az a következő napra esik. Így `["22:00", "00:00", "02:00"]` keddi ablaka kedd 22:00, szerda 00:00 és 02:00; `["02:00", "20:00"]` mindkét eleme a kezdő napra esik.
  - Érvényes lista: legfeljebb egy ilyen „visszalépés”, és ha van, az utolsó elem korábbi az elsőnél (az ablak rövidebb 24 óránál, és nem lóg bele a következő nap ablakába). Az `interval_from = interval_to` érvénytelen. Ezeket a séma nem tudja kifejezni, a backend ellenőrzi (M2-20, `422 validation_failed`).
  - A `weekdays` a kezdő napra vonatkozik, és az ablak minden köre a kezdő naphoz tartozik – ez a „nap” a jelentésekben is (M6-03).
  - Időszak (`from_date` … `to_date`, a telephely helyi dátumai, mindkét vég beleértve): azok a körök, amelyek ablaka ezeken a napokon kezdődik.
- **Indok:** Ugyanaz a szabály, mint az `interval` módnál; a supervisor úgy írja be az éjszakát, ahogy az őr bejárja (este kezdve).
- **Érintett:** `schedule/test-vectors.json`, `entities/schedule.json` (leírás), M2-20, M3-13, M5-17, M6-02, M6-03.

## 2026-10-27 – Az időkeret-alapérték szélei

- **Kérdés:** A `ceil(walk_duration_s × 1,5 / 300) × 5` képlet 0 mért másodpercre 0 percet ad, nagyon hosszú útra pedig a `time_limit_min` 1440-es felső korlátjánál többet.
- **Döntés:** `walk_duration_s = null` → 20 perc; egyébként `ceil(walk_duration_s / 200) × 5` (a képlettel azonos, de egész aritmetikával, lebegőpontos kerekítési hiba nélkül), legalább 5 és legfeljebb 1440 perc.
- **Indok:** Egy pontból álló útvonalnál a mért idő 0, de a körhöz kell idő; a felső korlát a séma érvényes tartománya.
- **Érintett:** `schedule/test-vectors.json` (`time_limit_default`), M2-20, M3-14, M5-17.

## 2026-10-27 – A menetrend-tesztvektorok fájlja

- **Kérdés:** Milyen szerkezetű a `schedule/test-vectors.json`, és hogyan van ellenőrizve?
- **Döntés:**
  - `expansion[]`: `{ name, description, schedule (érvényes entities/schedule.json), timezone, from_date, to_date, expected[] }`, ahol egy kör `{ start_day, wall_time, local, utc }`: a kezdő nap, a menetrendben megadott faliórás idő, a tényleges helyi idő eltolással (pl. `2026-03-29T03:00:00+02:00`) és az UTC időbélyeg.
  - `time_limit_default[]`: `{ walk_duration_s, time_limit_min }`.
  - A fájlt a `scripts/schedule-vectors.js` állítja elő (`npm run vectors:schedule`), kézzel nem szerkesztjük; a teszt bájtazonosságot ellenőriz.
  - Kézi ellenőrzés: a `scripts/schedule-vectors.test.js` a kritikus esetek (13 kör, éjfélen átnyúló lista, péntek–szombat, mindkét DST-éjszaka, nem létező és kétszer előforduló időpont, időkeret) várt értékeit a generátortól függetlenül, kézzel számolva tartalmazza. Ezen felül a PHP 8.5 (tzdata 2026.5) mind a 75 kör helyi ↔ UTC megfeleltetését megerősítette; eltérés csak a Q5-szabály két esetében van, ahol a PHP alapviselkedése más (lásd fent).
- **Érintett:** `schedule/test-vectors.json`, M3-13, M3-14, M6-02, M6-03.

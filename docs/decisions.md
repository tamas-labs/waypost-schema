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
- **Módosítva 2026-11-04:** az `$id` főverziót kap: `https://waypost.dev/schema/v1/<útvonal>` (lásd „Kompatibilitás a verziók között”).
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
  - base64: szabványos ábécé (RFC 4648 4. szakasz), kötelező `=` kitöltéssel, sortörés nélkül, nem üres. (Módosítva 2026-11-04: a kitöltés előtti nem használt bitek nullák, és a kulcs, a PIN-lenyomat és a só pontos bájthosszú; lásd „Kanonikus base64, pontos bájthossz”.)
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
- **Döntés:** A séma azt garantálja, hogy az érték matematikailag egész; az `47.4979` és a `474979000.5` elbukik. A küldő félnek egészként, tizedesrész nélkül kell kiírnia a számot. Az RFC 8785 kanonikus alakja `1.0`-ra és `1`-re is `1`, így a lenyomatban nincs eltérés. Ehhez a dekódolónak az egész értékű lebegőpontos számot vissza kell alakítania egésszé (PHP `json_decode`: `1.0` → `float`); ezt a `chain/test-vectors.json` `normalized` része rögzíti (2026-11-04, lásd „Lánc-tesztvektorok: nyers szöveg, normalizálás és elutasítás”). Az `accuracy_dm` felső korlátja 2³¹ − 1, a koordináták a fok × 10⁷ tartományában maradnak, így mindhárom elfér egy 32 bites egész oszlopban.
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
  - PHP-ban: rekurzív `ksort(SORT_STRING)` a nem-lista tömbökön, majd `json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR)`. Alapértelmezett flagekkel a vektorok közül kettő eltörik (ékezet, `/`, U+2028). Vigyázat: `json_decode(..., true)` után az üres objektum (`{}`) üres tömb lesz, és `[]`-ként íródik ki; a mai sémákban hash-elt üres objektum nem fordulhat elő. A `json_decode` az egész értékű számot (`9.0`, `8.64e7`, `-0.0`) `float`-ként adja: a `json_encode` előtt egésszé kell alakítani, a nem egész vagy ±(2⁵³ − 1) feletti értékre kivételt kell dobni – e nélkül a recept `9.0`-t írna ki (2026-11-04, a `normalized` és az `invalid` vektorok ellenőrzik; a recept a `scripts/chain-php.sh`-ban fut).
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
  - Kézi ellenőrzés: a `scripts/schedule-vectors.test.js` a kritikus esetek (13 kör, éjfélen átnyúló lista, péntek–szombat, mindkét DST-éjszaka, nem létező és kétszer előforduló időpont, időkeret) várt értékeit a generátortól függetlenül, kézzel számolva tartalmazza. Ezen felül a PHP 8.5 (tzdata 2026.5) az akkori 75 kör helyi ↔ UTC megfeleltetését megerősítette (0.1.0); eltérés csak a Q5-szabály két esetében van, ahol a PHP alapviselkedése más (lásd fent). 2026-11-04: hónap-, év- és hétváltás, szökőnap, többnapos időszak DST-váltással, `interval_every_min = 1440`, valamint `America/New_York` és `America/Santiago` (éjfélkor vált) esetek (SCH-004); a kézi várt értékek ezekre is a tesztben vannak.
- **Érintett:** `schedule/test-vectors.json`, M3-13, M3-14, M6-02, M6-03.

## 2026-10-27 – TS típusok a sémákból

- **Kérdés:** Hogyan legyenek a sémákból TS típusok, ha a json-schema-to-typescript a feltételes szabályokat (`if/then/else`) nem érti, és fájlonként külön-külön újradeklarálná a hivatkozott közös típusokat (`Timestamp1`, `Timestamp2`, …)?
- **Döntés:**
  - Egy fájl, `types/index.d.ts`; a `scripts/types.js` állítja elő (`npm run types`), kézzel nem szerkesztjük, a teszt bájtazonosságot ellenőriz. A csomag `types` mezője erre mutat.
  - Minden sémafájl egy nevesített típus, a neve az útvonalból jön: `common/lat-e7` → `LatE7`, `entities/route-version` → `RouteVersion`, `chain/payload-scan` → `ScanPayload`, `api/sync-push.request` → `SyncPushRequest`, kivétel: `api/error` → `ErrorResponse` (a globális `Error` miatt). A `$defs` is külön típus (`BootId`). A fájlok közötti `$ref` a hivatkozott típus nevére fordul, így egy típus egyszer szerepel.
  - A típus csak az alakot írja le. A mintákat, tartományokat, formátumokat és a feltételes szabályokat (pl. „`lat_e7` és `lng_e7` együtt `null`”) a sémavalidáció ellenőrzi; a generátor ezeket eldobja, és hibával leáll, ha más, nem típusosítható szerkezetet talál (`not`, nem feltételes `allOf`).
  - Kivétel a láncbejegyzés `type` → `payload` ága: ebből `ChainEntry` diszkriminált unió lesz (`ChainEntryFields`, `ChainEntryType`, `ChainPayloadMap`, `ChainEntryOf<T>`), így a `switch (entry.type)` a payloadot is szűkíti. A generátor a `chain/entry.json` `if/then` ágaiból olvassa, és leáll, ha a `type` enum és az ágak eltérnek.
  - `SchemaTypes`: séma-útvonal → típus térkép, hogy egy validátor szűkíthessen (`isValid<K extends keyof SchemaTypes>(schema: K, data): data is SchemaTypes[K]`).
  - A `maxItems` nem lesz tuple-unió (`media` max. 5 elem → `{…}[]`), a `minItems: 1` viszont nem üres tuple (`[T, ...T[]]`).
  - Ellenőrzés: TypeScript 7, `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` (`tsconfig.json`). A `scripts/types-sample.ts` minta lefordul, a benne lévő `@ts-expect-error` sorok (rossz payload, ismeretlen típus, hiányzó `null` mező, üres push, idegen enum-érték, többletmező) nem; a teszt minden érvényes példát is a sémája típusára illesztve fordítja (0.1.0-ban 97 volt).
- **Indok:** Az app a legszigorúbb TS-beállításokkal is használhassa a típusokat; a szűkíthető láncbejegyzés a bejegyzéstípusonkénti feldolgozásnál (M3) fontos. A példák lefordítása biztosítja, hogy a típus ne legyen szigorúbb a sémánál.
- **Érintett:** `types/index.d.ts`, `scripts/types.js`, `tsconfig.json`, M0-10, M3.

## 2026-10-27 – Csomagolás (0.1.0)

- **Kérdés:** Mit exportál a két csomag, és hogyan működik a JS-oldal Node-ban, Jestben és React Native-ben (Metro) is?
- **Döntés:**
  - npm, csak ES-modul, `exports`-szal:
    - `@waypost/schema`: `schemas` (útvonal → séma), `schemaId(path)`, `SCHEMA_ID_BASE` és minden típus (`SchemaPath`, `JsonSchema`, a `types/index.d.ts` összes típusa);
    - `@waypost/schema/vectors`: `chainVectors`, `scheduleVectors` (típusosan, `lib/vectors.d.ts`);
    - a nyers JSON-fájlok: `@waypost/schema/schemas/<útvonal>.json`, `/chain/test-vectors.json`, `/schedule/test-vectors.json`.
    - A belső fájlok (`scripts/`, `examples/`) nincsenek exportálva.
  - A JS-exportok a JSON-t nem importálják, hanem a `scripts/embed.js` által generált ES-modulokból (`lib/generated/`) olvassák. A Node JSON-t csak `with { type: 'json' }` import-attribútummal tölt be, a Metro ezt nem ismeri; a generált modul mindkettőben működik. A U+2028/U+2029 escape-elve van. A vektorok külön belépési pont, hogy a tesztadatok ne kerüljenek az app bundle-jébe.
  - A `lib/generated/` és a `types/` commitolva van (a `file:` függőség symlink, telepítéskor nincs build); az `npm test` elbukik, ha elavultak. `npm run build` mindkettőt újragenerálja.
  - Composer: `Waypost\Schema\Paths` (PSR-4, `src/`): `schemaDirectory()`, `schema($name)`, `schemaId($name)`, `schemaNames()`, `chainVectors()`, `scheduleVectors()`, `SCHEMA_ID_BASE` (azóta: `pinVectors()`, `VERSION`, `endpoints()`, `examplesDirectory()`; a teljes lista az `src/Paths.php`). A név formátumát ellenőrzi (nincs `..`), ismeretlen névre `InvalidArgumentException`. opis/json-schema-val: `$validator->resolver()->registerPrefix(Paths::SCHEMA_ID_BASE, Paths::schemaDirectory() . '/')` – ezzel kipróbálva a 0.1.0 mind a 326 példája (érvényes és érvénytelen) ugyanúgy döntött, mint az Ajv. 2026-11-04 óta ezt a CI minden példán ellenőrzi (`scripts/opis-parity.sh`), így a számot itt nem vezetjük.
  - Verzió: `package.json` `0.1.0`. A Composer `vcs` repositoryból a git tagből olvassa (`v0.1.0`), `path` repositoryból viszont mindig `dev-main`-t lát, akkor is, ha a HEAD tagen áll; ott a fogyasztó `options.versions`-szel adja meg. (Javítva 2026-11-04; a verzió futásidőben: lásd „CI és a szerződés verziójának rögzítése”.)
- **Indok:** A telepítés és az import minden futtatókörnyezetben build nélkül működjön; a backendnek elég a könyvtár, a validátor maga tölti be a hivatkozott sémákat.
- **Következmény az appban (M1-01, M3-04):** a `file:` függőség symlink a projekten kívüli `../waypost-schema` könyvtárra. Az Expo SDK 58 Metrója ezt külön beállítás nélkül becsomagolja (az M1-01-ben `expo export`-tal kipróbálva). A Jest viszont a valódi útvonalon fordítja a csomagot, és a Babel-segédeket (`@babel/runtime`) onnan keresné, ezért az app Jest-konfigurációjában `modulePaths: ["<rootDir>/node_modules"]` kell. Ha a csomag egyszer másolatként kerül a `node_modules`-ba (pl. `npm pack`), a Jest `transformIgnorePatterns`-ből ki kell venni a `@waypost/schema`-t (csak ES-modul).
- **Érintett:** `package.json`, `composer.json`, `lib/`, `src/Paths.php`, `scripts/embed.js`, `scripts/composer-smoke.sh`, M1-01, M2-01, M2-11, M3-04.

## 2026-10-28 – Közös PIN-tesztvektor (Q11)

- **Kérdés:** A PIN-t a szerver számolja (létrehozás, egyediség), az app ellenőrzi offline (react-native-quick-crypto). Hogyan derül ki, ha a két oldal PBKDF2-paraméterei vagy kódolása eltér?
- **Döntés:** `pin/test-vectors.json`, a `scripts/pin-vectors.js` generálja (`npm run vectors:pin`). A szabály:
  - a PIN pontosan 6 ASCII számjegy (`^[0-9]{6}$`; a vektorban `pin_pattern`), szövegként kezelve (`001234` ≠ `1234`);
  - az ellenőrző PBKDF2-HMAC-SHA256: jelszó = a PIN bájtjai, só = a `pin_salt` base64-dekódolt 16 bájtja, iteráció = a rekord `pin_iterations` értéke, kimenet 32 bájt, `pin_hash`-ként szabványos base64-ben;
  - új PIN: 100 000 iteráció, friss véletlen só (`defaults`). Ellenőrzéskor mindig a rekord iterációszáma számít, így később emelhető.
  - Esetek: `cases` (egyezik), `mismatches` (szomszédos és fordított PIN, nem egyezik), `malformed_pins` (rövid, hosszú, betű, szóköz, záró sortörés, nem ASCII számjegyek – a hash-elésük hiba). A mezőnevek az `entities/user`-éi, a teszt a felhasználósémával is ellenőrzi őket.
- **Indok:** Egy rossz iterációszám, base64url a szabványos base64 helyett vagy a PIN számként kezelése csendben eltérő hasht adna: az őr nem tudna belépni, és ez csak a terepen derülne ki. A teszt a generátortól független WebCrypto-implementációval számol újra, a PBKDF2 primitívet pedig az RFC 7914 vektorával ellenőrzi.
- **Érintett:** `pin/test-vectors.json`, `lib/vectors.js` (`pinVectors`), `src/Paths.php` (`pinVectors()`), M2-09, M3 (PIN-belépés).

## 2026-10-28 – Hibakód minden más 4xx és 5xx válaszra

- **Kérdés:** Az `api/error.json` szerint minden nem-2xx válasz a közös hibakódok egyikét adja, de a specifikáció listájában nincs kód arra, ami nem a kérés tartalmán múlik: nem támogatott kérésmód (405), túl nagy törzs (413), váratlan szerverhiba (500), karbantartás (503). Mit küldjön ilyenkor a backend?
- **Döntés:** Két új kód: `bad_request` minden más 4xx válaszra, `server_error` minden 5xx válaszra. A HTTP-státusz marad az eredeti (405, 413, 500, 503 …), a `message` magyar, `details` nélkül. A push `rejected[].code` mezője továbbra is csak a három bejegyzésszintű kódot engedi.
- **Indok:** Így a hibaválasz mindig érvényes a sémának, és az app egyetlen típussal kezel minden hibát. A két gyűjtőkód elég, mert ezekre az app nem tud tartalmilag reagálni: a `server_error` újrapróbálható, a `bad_request` programhiba. Új enum-érték egy válaszmezőben visszafelé kompatibilis bővítés (minor).
- **Érintett:** `common/error-code.json`, `api/error.json` példái, laravel-waypost M2-10, M3-04.

## 2026-10-28 – A konfigurációs CRUD végpontok sémái (M5-01, előrehozva)

- **Kérdés:** A feladatlista a `/sites`, `/users`, `/checkpoints`, `/routes`, `/schedules` és `/report-subscriptions` végpontok sémáit az M5-01-re teszi, a backend viszont az M2-16 – M2-21-ben már megépíti őket, és a sémaellenőrzéssel (M2-11) dolgozik. Mikor és milyen alakban készüljenek el?
- **Döntés:** Most, a backend előtt („előbb itt”). Az alak:
  - Fájlnevek: `api/<erőforrás>-create.request`, `-update.request`, `<erőforrás>.response` (egy rekord), `<erőforrás>-list.response`; egyes számú erőforrásnév (`site`, `user`, `checkpoint`, `route`, `route-version`, `schedule`, `report-subscription`), továbbá `site-user-attach.request`, `user-pin.request` és a közös `deleted.response`. A típusnevek ebből jönnek (`SiteCreateRequest`, `UserResponse` …).
  - Válasz: `{ server_time, <rekord neve>: <entitás> }`, lista: `{ server_time, <többes szám>: [...] }`, az entitássémák pontos alakjával (ugyanaz, mint a pullban). A verzió válasza a pull lapos listáit követi: `route_version` + `route_version_checkpoints`, mellette az útvonal (`current_version_id`). Létrehozás: 201, minden más: 200; törlés: `{ server_time }` (`deleted.response`).
  - Létrehozás: az entitás mezői szerveroldali mezők nélkül (`created_by`, időbélyegek, `version`, `position` nincs benne), opcionális `id` (az app által generált UUIDv7, az outbox miatt). Módosítás (`PATCH`): csak a változó mezők, legalább egy (`minProperties: 1`); a szülő (`site_id`, `route_id`) és a szerep nem változik. A `null` törlést jelent, a hiányzó mező változatlant.
  - A feltételes szabályok, amennyire a kérés egymagában eldönti: NFC típushoz `tag_uid` kell, a helyadat egyben (`lat_e7` és `lng_e7` együtt, `accuracy_dm` csak velük), menetrendnél a mód mezői kötelezők, a másik mód mezői tiltottak; őrnek nincs e-mail-címe és jelszava, supervisornak kötelező. Amit csak a tárolt rekorddal együtt lehet eldönteni (pl. módváltás nélkül a másik mód mezője, a lista „legfeljebb egy visszalépés” szabálya), azt a backend ellenőrzi, és a menetrend / pont leírása megnevezi.
  - Bemeneti engedékenység csak a címke UID-jánál: kettőspontos és kisbetűs alak is jó (`04:a1:b2…`), a szerver nagybetűs, elválasztó nélküli alakra hozza (ahogy az NFC-könyvtárak adják).
  - PIN: `common/pin` (6 számjegy szövegként, a `pin_pattern` szerint). Ha a kérésben nincs PIN, a szerver generál, és csak abban az egy válaszban adja vissza (`user.response` `pin`).
  - A fotó (`photo_media_id`) nincs a kérésekben: a médiasémával (M4-01) jön, mert a `media` sorhoz `sha256` és `taken_at` is kell.
  - Jogosultság a leírásokban, ahol a kérés alakján túl számít: egy másik felhasználót (e-mail, jelszó, PIN, aktív, hozzárendelés) csak az módosíthat, aki a felhasználó minden telephelyét kezeli (különben 403), mert egy közös telephely supervisora különben átvehetné egy kolléga fiókját és vele a többi telephelyét.
  - Fejlécek (minden sémaleírásban): supervisor token, vagy a telephelyi telefon eszköztokenje `X-Acting-User` fejléccel – ez a telefonon PIN-nel belépett supervisor ID-ja, és csak a telefon telephelyén érvényes; minden író kérés `Idempotency-Key`-t visz. A lista szűrői query paraméterek (`?site_id=`, `?route_id=`, `?user_id=`), a leírásban felsorolva.
- **Indok:** A szerződés egy helyen legyen, mielőtt két oldal épít rá; az entitások újrafelhasználásával a CRUD-válasz és a pull ugyanazt adja, így az app egyetlen upsert-logikával kezeli. A kérésekben az entitásnál engedékenyebb alakot csak ott engedünk, ahol a szerver egyértelműen normalizálni tud.
- **Érintett:** `schemas/api/*` (30 új séma), `schemas/common/timezone.json`, `schemas/common/pin.json`, `schemas/entities/site.json`, `scripts/pin-vectors.test.js`, M5-01, laravel-waypost M2-16 – M2-21, M5-03.

## 2026-10-28 – A pull teljes újrakezdése: `reset`

- **Kérdés:** A pull kurzora `updated_at` + `id` (Q3). Ha egy supervisort egy már meglévő telephelyhez rendelnek, a telephely régi rekordjai a kurzor előtt változtak, ezért egy inkrementális pull nem hozná el őket; ha leválasztják, a telephely rekordjai nem változnak, ezért a telefonján maradnának. Honnan tudja a kliens, hogy a helyi állapotát el kell dobnia?
- **Döntés:** A pull válasza opcionális `reset` mezőt kap (a hiánya `false`, a szerver mindig küldi). `true`, ha az oldal teljes állapotot kezd: a kérésben nem volt kurzor, vagy a hívó által látott telephelyek köre a kurzor kiadása óta megváltozott (a backend ezt a kurzorban tárolt lenyomatból tudja). A kliens ekkor ugyanabban a tranzakcióban, az oldal alkalmazása előtt törli a helyi konfigurációs rekordjait; a következő oldalak megint inkrementálisak. Egy útvonalverzió mindig az összes pontjával együtt jön, ezért egy ilyen oldalon 501 rekord is lehet. A hibás vagy ismeretlen kurzor validációs hiba (422).
- **Indok:** Telephelyenkénti kurzor nem fér el egy rövid, átlátszatlan szövegben, és az új telephely teljes tartalmát úgyis lapozva kell átküldeni. A telephelyi telefon telephelye nem változik, így nála `reset` csak kurzor nélküli kérésre jön; a supervisor saját telefonján nincs futó kör, amelyet a törlés zavarna. Opcionális mező, hogy a 0.1.0-ra épülő fogyasztóknak ne legyen törő változás.
- **Érintett:** `api/sync-pull.response.json`, laravel-waypost M2-23, M3-07.

## 2026-11-01 – A visszavont eszköz utolsó feltöltése kötegekben

- **Kérdés:** A specifikáció szerint a visszavont eszköz „még egyszer” tölthet fel (`POST /sync/push-final`). Egy hívásba legfeljebb 200 bejegyzés fér, és a fotók csak a bejegyzések után mehetnek fel, külön kérésben. Hogyan jut fel minden adat?
- **Döntés:** Az „egyszer” egy feltöltési folyamatot jelent, nem egy HTTP-kérést. A sorrend: kötegek (`done: false`, legfeljebb 200 bejegyzés), fotók (`PUT /media/{id}`), végül egy `done: true` kérés (az `entries` lehet üres). Utána a `push-final` és a `PUT /media/{id}` is `401 device_revoked`. A `done: true` akkor is lezár, ha maradt elutasított bejegyzés vagy hiányzó fotó, mert ezeket az eszköz már nem tudja megjavítani. Nem visszavont eszköz: `403 forbidden`.
- **Indok:** Egy kérés sem nagyobb korláttal, sem a fotók miatt nem elég: ami nem fér bele, az a tokenek törlésével elveszne. Hosszú offline időszak után 200-nál több bejegyzés is várhat (5 perces körökkel, 6 ponttal egy éjszaka ezernél is több). A kötegelés a push kódját használja újra, és megszakadt futás után folytatható.
- **Érintett:** `api/sync-push-final.*.json`; eltér a specifikáció *Azonosítás* 5. pontjának szövegétől és az M4-08 eredeti elfogadásától („második hívás 401”): helyette a lezárás utáni hívás 401. M4-08, M4-11.

## 2026-11-01 – A fotó feltöltése: `PUT /media/{id}`

- **Kérdés:** Milyen mezőket visz a multipart kérés, és hogyan jön létre a pont fotójának `media` sora, ha a sorrend push, média, outbox, tehát a fotó a pont létrehozása előtt megy fel?
- **Döntés:**
  - **Mezők:** `sha256`, `owner_type` (`scan`, `incident`, `checkpoint`), `owner_id`, `taken_at`, mindig mind a négy; ezeket a telefon `media` sora tartalmazza. A `mime` és a `size_bytes` a fájlból adódik, csak `image/jpeg` engedett (az app mindig JPEG-et ment). A séma csak a szöveges mezőket írja le, így közvetlenül ellenőrizhető; a `file` rész a leírásban szerepel.
  - **Lánc fotója (`scan`, `incident`):** a sor a bejegyzésből jön létre, ezért a bejegyzés elfogadása előtt `404 not_found`. A lenyomat a fájlra és a payloadra is ellenőrzött, eltérésnél `422 validation_failed`. Ugyanaz a fájl újra: `200`.
  - **Pont fotója (`checkpoint`):** a feltöltés maga hozza létre a sort, a pontnak még nem kell léteznie (az `owner_id` az app által generált UUIDv7). A pont kérésének új, opcionális `photo_media_id` mezője erre hivatkozik; ha nincs ilyen fotó, vagy más a tulajdonosa: `422 validation_failed`.
  - **`entities/media`:** a `path` szerveroldali, nincs benne. A pullba nem kerül, mert ebben a lépcsőben nincs tokennel hívható végpont a fotó letöltésére. (Pontosítás 2026-11-04: a jelentések bélyegképeihez a backend aláírt URL-es `GET /media/{media}/file` végpontot ad, token nélkül; az `endpoints.json` `media.file` néven tartalmazza.)
- **Indok:** A négy mező egységes, feltétel nélküli szerződés. A 2026-10-28-as döntés a `photo_media_id`-t ide halasztotta.
- **Megjegyzés a backendnek:** a PHP a `PUT` multipart törzsét nem bontja ki automatikusan; PHP 8.4-től erre a `request_parse_body()` való (M4-07). A `media` tábla `taken_at` oszlopa kötelező, ezért a bejegyzésből létrejövő sorhoz a bejegyzés idejét kell használni, amíg a feltöltés a pontos értéket nem hozza.
- **Érintett:** `api/media-upload.*.json`, `entities/media.json`, `api/checkpoint-create.request.json`, `api/checkpoint-update.request.json`, M4-07, M4-10, M5-13.

## 2026-11-02 – A diagnosztikai jelzés (Q2)

- **Kérdés:** A specifikáció szerint `chain_gap` és `chain_fork` esetén az app „diagnosztikai eseményt küld”, de erre nincs se bejegyzéstípus, se végpont. Mi legyen az?
- **Döntés:** A feladatlista javaslata szerint külön, láncon kívüli végpont: `POST /devices/diagnostics` (`api/device-diagnostic.request` és `.response`). Egy jelzés egy push-válasz elutasításait foglalja össze: az első elutasított bejegyzés (`entry_id`, `seq`, `code`, `expected_seq`), a szerver `last_seq`-je, az elutasítások száma és a válasz `server_time`-ja. A `bad_hmac` is ide tartozik, mert azt sem javítja meg az újraküldés. Az `id`-t az app generálja, így az újraküldés nem hoz létre második sort. A visszavont eszköz a feltöltése lezárásáig küldhet.
- **Indok:** Bejegyzéstípus nem lehet: maga a lánc a hibás, a jelzés nem érne fel. A szerver a rossz bejegyzést is eltárolja, de egy `seq` helyén az új lecseréli (`laravel-waypost/docs/decisions.md`, „A push feldolgozása”), így a jelzés őrzi meg az esemény nyomát.
- **Érintett:** `api/device-diagnostic.*.json`, M4-09, M6 (a jelentés olvassa).

## 2026-11-02 – Az ismételt létrehozás (M5-02)

- **Kérdés:** Az outbox (M5-03) a létrehozást az app által generált `id`-val küldi. Ha a válasz elveszett, és az `Idempotency-Key` 24 órája lejárt (vagy az app új kulccsal próbálkozik), a foglalt `id` eddig `409 conflict` volt, pedig a rekord épp ettől a kéréstől jött létre. Mi a helyes válasz?
- **Döntés:** Ugyanarra az `id`-ra a létrehozás idempotens. Ha a rekord létezik, ugyanazzal a nem változó szülővel (pont, útvonal: `site_id`; verzió: az útvonal; menetrend: `route_id`; felhasználó: `role`; előfizetés: `user_id` és `site_id`; telephely: nincs), és a hívó látja, a válasz `200` a rekord **jelenlegi** állapotával, és nem változik semmi. A törzs többi mezőjét a szerver nem veti össze, mert a rekord azóta módosulhatott, és a szerver normalizál (címke-UID, generált QR-kód, PIN-lenyomat). A szerver generálta PIN-t az ismétlés nem adja vissza. A törölt rekord, a más szülőjű, és amit a hívó nem lát: `409 conflict`, mint eddig.
- **Indok:** Az outbox a 4xx-et a supervisornak jelzi, és nem küldi újra; egy sikeres létrehozás így hibának látszana. A `201` helyett `200`, mert ez a kérés nem hozott létre semmit; az app mindkettőt sikernek veszi. Leírásváltozás, az érvényes példányok köre nem változik, ezért a még ki nem adott 0.4.0-ba került.
- **Érintett:** `api/*-create.request.json` (7), a válaszsémák leírása, laravel-waypost M5-02, waypost M5-03.

## 2026-11-03 – A jelentésarchívum: `GET /reports` (M6-01)

- **Kérdés:** Mit ad vissza a `GET /reports?site_id=` (specifikáció: API-szerződés), és hogyan kerül bele az aláírt letöltési URL?
- **Döntés:**
  - Új entitás: `entities/report` – a `reports` tábla hálózati alakja, a címzettek e-mail-címei (`recipients`) és a tárolási útvonal (`path`) nélkül, mert ezek csak szerveroldaliak (mint a `users.email`). Az időszak (`period_start`, `period_end`) műszakjelentésnél a műszak kezdete és vége, a többinél az első nap kezdő és az utolsó nap utáni helyi éjfél (a vége kizárólagos) – a napok köreit a kezdő nap adja, ezért a körök a vége után, másnap reggelig is tarthatnak.
  - A letöltés egy `download: { url, expires_at } | null` objektum: aláírt, lejáró URL, amelyhez nem kell token (e-mailből és böngészőből is megnyílik); `null`, ha a jelentésnek nincs tárolt fájlja (a műszak- és a napi jelentés csak e-mail), vagy az adatmegőrzés már törölte. Két külön, együtt `null` mező helyett egy objektum, mert a „mindkettő vagy egyik sem” szabályt így a típus is kifejezi. A lejárt URL `403 forbidden`; az új URL-t a lista újbóli lekérése adja.
  - Válasz: `api/report-list.response` – `reports` (a legújabb időszak elöl, azonos kezdésnél `id` szerint), legfeljebb 100 elem oldalanként, és `next_cursor` (átlátszatlan szöveg, az utolsó oldalon `null`). Szűrés: `?site_id=`, `?type=`. A lapozás azért kell, mert a jelentések sorai az adatmegőrzés után is megmaradhatnak, így a lista évek alatt telephelyenként több száz elemre nőhet.
  - Új közös séma: `common/report-frequency` (`shift`, `daily`, `weekly`, `monthly`) – a jelentés `type`-ja és az előfizetés `frequency`-je ugyanaz a felsorolás, ezért a `report-subscription` sémái is erre hivatkoznak (az érvényes példányok köre nem változik; a TS-ben `ReportFrequency` lett a mező típusa, szerkezetileg ugyanaz az unió).
  - Csak supervisor token: a specifikáció táblázata szerint, és mert a jelentések a telephelyi telefonon nem kellenek.
- **Indok:** A specifikáció „jelentésarchívum (aláírt letöltési URL-ekkel)” sora szerint a legegyszerűbb alak; minor verzió (0.5.0), mert csak új sémák jöttek.
- **Érintett:** `schemas/entities/report.json`, `schemas/api/report-list.response.json`, `schemas/common/report-frequency.json`, `schemas/entities/report-subscription.json`, `schemas/api/report-subscription-*.request.json`, M6-01, M6-04.

## 2026-11-04 – CI és a szerződés verziójának rögzítése (SCH-001, SCH-002)

- **Kérdés:** Az audit (`docs/AUDIT-ISSUES.md`, SCH-001, SCH-002) szerint a szerződést semmi nem ellenőrzi automatikusan, pedig a specifikáció CI-ben validálást ír elő; a két fogyasztó pedig a szomszédos munkapéldányt használja szimlinken, a lockfájljuk nem a valós verziót mutatja, és futásidőben sem derül ki, melyik sémaverzióval dolgozik a szerver. Hogyan legyen ellenőrzött a kiadás, és honnan tudja a fogyasztó, melyik verziót használja?
- **Döntés:**
  - **CI** (`.github/workflows/ci.yml`) minden `main`-pushra, pull requestre és `v*` tagre: `npm ci`, `npm test`, `npm run typecheck`; `composer validate --strict`, `scripts/composer-smoke.sh` (Composer-telepítés és `Paths`), `scripts/opis-parity.sh` (minden példa opis/json-schema-val is, a backend `registerPrefix`-receptjével – mindnek ugyanúgy kell döntenie, mint az Ajv-nek). Tagre ezen felül `node scripts/release.js <tag>`: a tag `v<package.json version>`, a `CHANGELOG.md`-ben van `## [<verzió>] – <dátum>` szakasz, és a `Paths::VERSION` meg a `SCHEMA_VERSION` ugyanaz.
  - **Kiadás:** a verzió egyszerre lép a `package.json`-ban, az `src/Paths.php` `VERSION` konstansában és a CHANGELOG-ban, utána `npm run build`. Commit a `main`-re, a tag csak zöld CI után. A `main` ágvédelme (kötelező CI-ellenőrzés) a GitHub beállításaiban van, nem a repóban.
  - **A verzió futásidőben:** npm `SCHEMA_VERSION` (`lib/generated/version.js`, a `package.json`-ból generálva), Composer `Waypost\Schema\Paths::VERSION`. A konstans azért kell, mert `path` repositoryból a Composer `dev-main`-t lát, a `composer.json`-ban pedig nincs `version`. Az egyezést a `scripts/release.test.js` ellenőrzi.
  - **A fogyasztók tagre rögzítenek**, a `file:` / `path` szimlink csak a helyi fejlesztés eszköze. A fogyasztó repójában a `.waypost-schema-version` fájl adja a várt taget (pl. `v0.5.0`); a fogyasztó CI-je ezt a taget veszi ki a szomszédos `waypost-schema` könyvtárba; egy teszt elbukik, ha a `SCHEMA_VERSION` / `Paths::VERSION` nem ez. Az app ezt már így csinálja (M3-39); a backendnek is így kell, és a `composer.json` `options.versions` értéke is a rögzített verzió legyen. A `file:` / `path` csomag verziója a lockfájlban csak tájékoztató; verzióváltáskor `npm install`, illetve `composer update waypost/schema` frissíti.
  - **Futásidejű jelzés:** a backend minden API-válaszban elküldi az `X-Waypost-Schema: <Paths::VERSION>` fejlécet; az app `__DEV__`-ben összeveti a saját `SCHEMA_VERSION`-jével, és figyelmeztet, ha a major vagy a minor eltér (a patch az érvényes példányok körét nem változtatja).
  - Nem választott: npm `git+https://…#vX.Y.Z` és Composer `vcs` repository. Az app Metro- és Jest-beállítása a szimlinkre épül (lásd „Csomagolás”), a kiadott archívumból akkor még hiányzott az `examples/`, amelyre a backend tesztjei épülnek (azóta benne van, lásd SCH-011); a rögzítő fájl + CI-checkout + verzióteszt ugyanazt a reprodukálhatóságot adja.
- **Indok:** A kiadás egy push és egy tag, a szimlink miatt pedig a fogyasztók azonnal megkapják; hibás vagy elavult generált fájl, elbukó példa vagy eltérő opis-döntés így nem kerülhet tagre. A verziókonstans nélkül a fogyasztó tesztje nem tudná megmondani, melyik szerződésen fut, és a két oldal észrevétlenül eltérő verzióval kerülhetne ki.
- **Érintett:** `.github/workflows/ci.yml`, `scripts/opis-parity.sh`, `scripts/release.js`, `scripts/release.test.js`, `src/Paths.php`, `lib/index.js`, `lib/generated/version.js`; waypost (`.waypost-schema-version`, `__tests__/schema-package.test.ts`, a fejléc ellenőrzése), laravel-waypost (rögzítő fájl, CI, verzióteszt, `X-Waypost-Schema`).

## 2026-11-04 – Lánc-tesztvektorok: nyers szöveg, normalizálás és elutasítás (SCH-003)

- **Kérdés:** A `cases` és a `chain` vektorok mind érvényes, már dekódolt bemenetek. Mit tegyen az ellenőrző (a backend a pushnál, egy későbbi harmadik implementáció) azzal a bejegyzéssel, amelynek a szövege másképp van leírva (`9.0`, `\u00e1`, `\/`, tördelés), vagy amely nem hash-elhető (`9.5`, 2⁵³, `1e400`, magányos surrogate)?
- **Döntés:**
  - A `chain/test-vectors.json` két új része nyers JSON-szöveget ad (`entry_json`: a teljes, `hash`-sel aláírt bejegyzés), hogy a dekódolás is a teszt része legyen. Az ellenőrzés menete: dekódolás → `chain/entry.json` sémaellenőrzés → kanonikus JSON a `hash` nélkül → HMAC összevetése a `hash`-sel.
  - `normalized.cases[]`: `{ name, description, entry_json, canonical_json, hash }` – ugyanannak a bejegyzésnek a másképp leírt szövegei (egész értékű tört és exponenciális alak, `-0.0`; escape-elt ékezet, `\/`, `\u0008`, surrogate-pár escape; CRLF-es tördelés, fordított kulcssorrend). Mindegyikből ugyanaz a `canonical_json` és `hash` jön ki, vagyis ezeket **normalizálni kell, nem elutasítani**.
  - `invalid.cases[]`: `{ name, description, expected, entry_json }`, ahol `expected`:
    - `invalid`: nem érvényes bejegyzés, vagy nem kanonizálható – a push `422 validation_failed`. Ilyen a tört szám, a 2⁵³, az `1e400`, a magányos surrogate (a `JSON.parse` elfogadja, a `json_decode` nem; az eredmény mindkettőnél elutasítás), a hiányzó `null` mező, az idegen mező és az üres `payload`.
    - `bad_hmac`: érvényes bejegyzés, de a `hash` nem a kanonikus JSON HMAC-ja – a push a bejegyzést `bad_hmac`-kal utasítja el. Ilyen a rendezetlen kulcsú szöveg, a PHP alapértelmezett `json_encode`-jával (`\/`, `\uXXXX`) írt szöveg, és a `"seq":9.0`-val írt kanonikus szöveg HMAC-ja.
  - A referencia-ellenőrző a `scripts/chain-vectors.js` `verifyEntryJson()`-ja (Ajv). A `scripts/chain-php.sh` minden vektort PHP-val is lefuttat (a fenti recept + opis/json-schema), a CI-ben is.
  - Ismétlődő kulcsot (`{"seq":1,"seq":2}`) a vektorok nem rögzítenek: a `JSON.parse` és a `json_decode` is az utolsót tartja meg, így a két oldal nem tér el, az app pedig nem küld ilyet.
- **Indok:** A specifikáció szerint a közös vektoroknak kell bizonyítaniuk, hogy a két nyelv ugyanúgy viselkedik, a határeseteken és a hibás bemeneten is. A dekódolt bemenetből nem derül ki, hogy a PHP `float`-ként olvassa az `1.0`-t – éppen ezen csúszott el korábban a recept.
- **Érintett:** `chain/test-vectors.json`, `scripts/chain-vectors.js`, `scripts/chain-php.sh`, `.github/workflows/ci.yml`, M3-10, M4-02, M4-03.

## 2026-11-04 – Menetrend-vektorok: naptárhatárok, többnapos időszak, más DST-szabály (SCH-004)

- **Kérdés:** A 16 kibontási eset a DST-éjszakákat jól lefedte, de a PHP (`DateTime`, `range`) és a TS dátumaritmetikája jellemzően a hónap- és évhatáron, a többnapos tartományon és más időzónák szabályain tér el. Melyik esetek kellenek még?
- **Döntés:** 11 új eset (27 eset, 175 kör):
  - `month-boundary` (10-31 → 11-01), `year-boundary` (12-31 → 2027-01-01), `leap-day` (2028-02-28 → 02-29 → 03-01), `sunday-into-monday` (a vasárnapi ablak az időszak utáni hétfőn ér véget, és az időszakhoz tartozik);
  - `monthly-period-with-dst-gap` (egy egész hónap napi 02:30-as köre, benne a tavaszi réssel), `weekly-period-with-dst-overlap` (egy hét, benne az őszi váltással);
  - `every-1440` (a legnagyobb lépés, az ablaknál hosszabb: naponta egy kör);
  - `new-york-spring-gap`, `new-york-autumn-repeat` (más dátumon és 02:00-kor váltó szabály), `santiago-spring-midnight-gap`, `santiago-autumn-repeat-before-midnight` (éjfélkor váltó szabály: a 00:00 nem létezik, illetve az éjfél előtti óra kétszer van).
  - A vektorok tzdata-függők: a generátor a Node ICU-adatbázisát használja (2026-11-04: tzdata 2025b), a PHP a sajátját vagy a rendszerét. A választott dátumokra 2022 óta egyik szabály sem változott.
- **Indok:** Az eltérés a fogyasztók között éppen ezeken a pontokon szokott előjönni. Az új esetek már az első futáskor találtak egy backend-hibát: az `every-1440` esetén a PHP `range()` `ValueError`-t dob, ha a lépés nagyobb az ablaknál. A javítás a backend feladata; az app mindegyik esetet helyesen bontja ki.
- **Érintett:** `schedule/test-vectors.json`, `scripts/schedule-vectors.js`, `scripts/schedule-vectors.test.js`, M3-13, M6-02.

## 2026-11-04 – Kompatibilitás a verziók között, a `/v1` és a `/v2` együttélése (SCH-008)

- **Kérdés:** Az app áruházon át frissül, így a backendnek egyszerre kell kiszolgálnia régi és új appot, egy major váltásnál `/v1`-et és `/v2`-t is. Mivel minden objektumséma `additionalProperties: false`, és a felsorolások zártak, egy „minor” bővítés a régi sémával ellenőrző fogadónak törő: a régi backend 422-vel utasítja el az új app új mezőjét, egy új bejegyzéstípus pedig az egész push-köteget, és mivel a lánc nem ugorhat át bejegyzést, minden későbbi feltöltés megáll. Hogyan maradnak kompatibilisek a verziók, és hogyan él együtt két főverzió?
- **Döntés:**
  - **`$id` főverzióval:** `https://waypost.dev/schema/v1/<útvonal a schemas/ alatt>` (`SCHEMA_ID_BASE`, `Paths::SCHEMA_ID_BASE`). A `v1` az API főverziója (`/v1`), nem a csomagé: a 0.x és az 1.x kiadások ugyanazt a `v1` előtagot használják. A fájlok helye (`schemas/<útvonal>`) nem változik. Most, 0.x alatt még megtehető major nélkül: mindkét fogyasztó a konstanson és a `schemaId()`-n át hivatkozik, és rögzített verzión áll (`.waypost-schema-version`), így az új előtagot csak a következő pin-léptetéskor kapja meg, kódváltozás nélkül.
  - **Sorrend:** séma-kiadás → backend → app, mindig. A backend a szerződés minden minor verzióját a saját pinjével ismeri; az app áruházi verziói közül többet is kiszolgál.
  - **Kompatibilitási mátrix** (minor változás; „régi” = a változás előtti pin):

    | Változás | régi app × új backend | új app × régi backend |
    |---|---|---|
    | új opcionális mező a **kérésben** | jó | 422 – az app csak akkor küldi, ha a szerver `X-Waypost-Schema` verziója ≥ a bővítés verziója |
    | új enum-érték / új bejegyzéstípus a **kérésben** | jó | 422, a láncnál a feltöltés megáll – ugyanígy csak a szerver verziója szerint |
    | új opcionális mező a **válaszban** | jó (élesben figyelmen kívül hagyja; `__DEV__`-ben sémahiba) | jó |
    | új enum-érték a **válaszban** (pl. hibakód) | az app az ismeretlen értéket tartalék ágon kezeli (ismeretlen hibakód: a HTTP-státusz szerint) | jó |
    | új séma / új végpont | jó | 404 – az app csak a szerver verziója szerint hívja |
    | szigorítás (eddig érvényes példány érvénytelen lesz) | 422 a régi appnak | jó |
    | sémaútvonal átnevezése / törlése | az outboxban álló kérés elakad | – |

    Ebből a szabály: kérésoldali bővítés **backend-először**, és az app a szerver fejlécéből dönti el, küldheti-e; válaszoldali bővítés csak opcionális mező vagy olyan enum-érték, amelyre az appnak van tartalék ága; szigorítás csak akkor minor, ha a küldő fél bizonyíthatóan sosem küldött ilyet (egyeztetett kiadással), egyébként major; sémaútvonal minor verzióban nem nevezhető át és nem törölhető (SCH-028). A CHANGELOG verziózási szabálya ezt összefoglalja.
  - **A `/v1` és a `/v2` együttélése:** egy csomagból nem telepíthető két főverzió egymás mellé (sem npm-en, sem Composerrel), ezért a 2.0.0 kiadás **mindkét** készletet tartalmazza: a `/v2` sémákat `https://waypost.dev/schema/v2/` előtaggal, és a `/v1` utolsó állapotát befagyasztva (csak javítás), `https://waypost.dev/schema/v1/` előtaggal, külön könyvtárban. Mindkettő egy validátorba tölthető, mert az előtagjuk különbözik; a backend a `/v1` útvonalakat a `v1`, a `/v2`-t a `v2` készlettel ellenőrzi. A `/v1` készlet akkor kerül ki, amikor már egyik támogatott app sem használja (major). A pontos könyvtárszerkezet és a `Paths` / `lib` API (verzióparaméter) a 2.0.0 tervezésekor dől el; ekkor a `Paths::schemaNames()` egyszintes bejárását (SCH-027) is módosítani kell.
- **Indok:** A kompatibilitás eddig egy telepítési sorrenden múlt, amelyet csak egy mondat rögzített. A futásidejű `X-Waypost-Schema` fejléc (0.6.0) óta az app ténylegesen el tudja dönteni, mit küldhet; a mátrix ezt teszi szabállyá. Az `$id` most ingyen kapja meg a főverziót, később már csak major verzióval kaphatná.
- **Érintett:** minden séma (`$id`), `scripts/validate.js`, `scripts/types.js`, `lib/index.js`, `lib/index.d.ts`, `src/Paths.php`, `CHANGELOG.md`, az app (`X-Waypost-Schema` alapú döntés, tartalék ágak) és a backend (sorrend).

## 2026-11-04 – Az `Idempotency-Key` protokoll a szerződésben (SCH-007)

- **Kérdés:** Az idempotencia tényleges szabályai (a kulcs alakja, hatóköre, a 24 órás visszajátszás, a tárolt 4xx, az egyidejű ismétlés `409`-e) eddig csak a backend döntésnaplójában voltak, pedig az app ezekre épít, és egy új kliens a sémákból rosszul kezelné a `409`-et. Kell-e ehhez saját hibakód?
- **Döntés:**
  - A protokoll a szerződés része, a backend mai működése szerint (`laravel-waypost` 2026-10-28 „`Idempotency-Key` (M2-12)” és 2026-11-02 „Az ismételt létrehozás”):
    - **Mikor:** minden azonosított író kérésen kötelező (a `POST /auth/login` és a `POST /auth/logout` kivétel). Hiányzó vagy hibás fejléc: `422 validation_failed`, `details`: `{"Idempotency-Key": [...]}`.
    - **Alak:** bármely UUID, kis- és nagybetűvel is (`common/idempotency-key.json`); az app logikai kérésenként új UUIDv7-et küld.
    - **Hatókör:** a token gazdája (felhasználó vagy eszköz; az `X-Acting-User`-rel küldött kérés az eszközé).
    - **Visszajátszás:** ugyanarra a kulcsra 24 órán át ugyanaz a válasz (státusz és törzs, `Idempotent-Replayed: true` fejléccel), a kérés nem fut újra; csak a `server_time` friss. A 4xx is tárolódik, az 5xx nem. Ugyanaz a kulcs más kéréssel (módszer, útvonal, query, törzs): `422 validation_failed`.
    - **Egyidejű ismétlés:** amíg az első kérés fut, `409 conflict` `Retry-After` fejléccel (ma 5 másodperc). Ez az egyetlen `409`, amelynek `Retry-After`-je van; ugyanazzal a kulccsal később újra kell küldeni. A többi `409` (foglalt PIN, címke vagy `id`) végleges.
    - **Kliensszabályok:** hálózati hiba, 5xx vagy `Retry-After`-es `409` után ugyanazzal a kulccsal kell újrapróbálni. Más 4xx után új kulccsal, mert a régi 24 órán át ugyanazt a 4xx-et adná vissza. A 401 és a 429 nem tárolódik, mert az azonosítás és a throttling a kulcs kezelése előtt fut (pl. a fotó `404`-e, amíg a bejegyzése nincs elfogadva).
  - Az „egyszer megmutatott” titkok (az eszköz tokenje és titka, a szerver generálta PIN) ugyanazzal a kulccsal 24 órán át újra visszajönnek, mert különben egy elveszett válasz után a hozzárendelés vagy a PIN használhatatlan maradna; más végpont és az azonos `id`-jú ismételt létrehozás nem adja vissza őket. A `devices-enroll.response` és a `user.response` leírása ezt mondja.
  - **Nincs új hibakód:** a még futó kérés `409 conflict` + `Retry-After` marad. Egy `request_in_progress` kód tisztább lenne, de mindkét fogyasztóban változtatást kívánna; a `Retry-After` jelenléte ugyanazt egyértelműen elmondja. Ha egyszer mégis saját kód kell, az a válaszoldali bővítés szabályai szerint (az appnak tartalék ága van a `409`-re) minor verzióban felvehető.
  - A fejlécek továbbra sem részei a törzs-sémáknak. A kérés-sémák leírása az `Idempotency-Key`-nél a `common/idempotency-key.json`-ra hivatkozik; az `error-code` leírása a `conflict`-nál megemlíti a `Retry-After`-t.
- **Indok:** „A szerződés előbb itt” elve szerint a két oldal viselkedési megállapodásának a közös rétegben a helye. A szabályok változatlanok, csak a helyük új, így egyik oldalnak sem kell módosulnia.
- **Érintett:** `common/idempotency-key.json`, `common/error-code.json`, `api/devices-enroll.response.json`, `api/user.response.json`, az író végpontok kérés-sémáinak leírása, M2-12, M3-04, M5-03, M4-10.

## 2026-11-04 – Közös lapozási minta, a CRUD-listák lapozása (SCH-009)

- **Kérdés:** A két lapozott végpontnak eddig két különböző alakja volt (pull: `cursor` + `has_more`; jelentések: `next_cursor | null`), a hét CRUD-lista pedig nem lapozott, és nem volt felső elemszáma. Később bevezetni a lapozást törő változás lenne. Hogyan legyen?
- **Döntés:**
  - Közös alak: `common/next-cursor.json` – átlátszatlan, 1–255 karakteres szöveg, vagy `null` az utolsó oldalon. A következő oldalt a `cursor` query paraméterrel kell kérni, ugyanazokkal a szűrőkkel. Ismeretlen vagy hibás kurzor: `422 validation_failed`. A `report-list.response` `next_cursor`-ja erre hivatkozik (az alakja nem változott).
  - A hét CRUD-lista (`site-`, `user-`, `checkpoint-`, `route-`, `route-version-`, `schedule-`, `report-subscription-list.response`) **opcionális** `next_cursor` mezőt kap. Ha hiányzik vagy `null`, a lista teljes. Ha szöveg, a szerver lapoz: oldalanként legfeljebb 500 elem (az útvonalverzió a pontjaival együtt), és a kliensnek a kurzort követve össze kell fűznie az oldalakat. A szerver új sémaverzió nélkül kezdhet lapozni, ezért a kliensnek most kell megtanulnia követni a kurzort. A mai backend nem lapoz, és ehhez nem is kell változnia.
  - A listák `maxItems`-et most nem kapnak: ez szigorítás volna egy olyan válaszon, amelyet a mai backend korlátlanul ad.
  - A pull alakja marad (`cursor` mindig szöveg + `has_more`), mert ott a kurzor nemcsak a következő oldalt jelöli, hanem a következő növekményes pull kezdőpontját is, ezért az utolsó oldalon sem lehet `null`.
- **Indok:** Ez a kompatibilitási szabályok szerinti válaszoldali bővítés (opcionális mező), így most még törés nélkül bevezethető. Egy közös kliensoldali lapozó írható rá, és egy nagy ügyfélnél a szerver major verzió nélkül kezdhet lapozni.
- **Érintett:** `common/next-cursor.json`, a nyolc `*-list.response.json`, M5 (az app listanézetei), M2 (a backend listái).

## 2026-11-04 – Géppel olvasható végponttábla és query-sémák (SCH-006)

- **Kérdés:** A sémák csak a JSON-törzseket írták le. Hogy melyik metódus és útvonal melyik kérés- és válaszsémát használja, milyen státusszal, ki hívhatja, és milyen query paramétereket fogad, az csak a `description`-ökben volt, a backend útvonaltáblája és az app végpontlistája pedig külön-külön tartotta nyilván. Hogyan legyen géppel olvasható?
- **Döntés:**
  - **`endpoints.json`** a repó gyökerében: saját, egyszerű formátum, nem OpenAPI. Új eszköz nem kell hozzá, és pontosan azt írja le, amit a két fogyasztó ellenőrizni tud. Végpontonként: `name` (a backend útvonalneve `waypost.` nélkül, pl. `sites.store`), `method`, `path` (az API-alaphoz képest, amely `/v1`-re végződik; `{név}` útvonalparaméter), `path_parameters` (paraméter → séma), `auth` (`none`, `supervisor`, `device`, `acting` = eszköztoken + `X-Acting-User`, `revoked`, `signed_url`; bármelyik), `idempotency_key`, `query` (séma vagy `null`), `request` és `responses` (státusz → `{ content_type, schema }`; bináris törzsnél `schema: null`). Minden más státusz a közös `error_response` (`api/error`). A fejlécek (`Idempotency-Key`, `X-Acting-User`) a `headers` alatt, sémával.
  - A tábla mind a 48 végpontot tartalmazza, a két aláírt URL-es letöltést (`media.file`, `reports.file`) is (SCH-030).
  - **Query-sémák:** `api/<lista>.query.json` a szűrős listákhoz (`user-`, `checkpoint-`, `route-`, `schedule-`, `report-subscription-`, `report-list.query`), `api/sync-pull.query.json`, és a szűrő nélküli listák közös `api/list.query.json`-ja (csak `cursor`). A sémák a dekódolt query stringet írják le (minden érték szöveg, mindegyik legfeljebb egyszer). Az azonosító-szűrő UUIDv7, a kurzor `common/cursor.json` (1–255 karakter); hibás érték: `422 validation_failed`. Ismeretlen paramétert a kliens nem küld (`additionalProperties: false`). A mai backend az ismeretlen paramétert figyelmen kívül hagyja, a pullnál az üres `cursor=`-t kurzor nélkülinek veszi; ez a kliens szempontjából nem eltérés, mert a kliens ilyet nem küld.
  - **Ellenőrzés:** a `scripts/endpoints.js` (a `validate.js` része, így az `npm test`-é is) a tábla alakját a `scripts/endpoints.schema.json` szerint ellenőrzi. Ezen felül azt is, hogy minden megnevezett séma létezik és jó fajtájú (`.query`, `.request`, `.response`), hogy **minden `api/` sémát használ egy végpont**, hogy a név és a metódus + útvonal egyedi, hogy az útvonalparaméterek az útvonalból jönnek, a GET-nek nincs törzse és kulcsa, és hogy az auth-fajták és a fejlécek deklarálva vannak.
  - **Terjesztés:** npm: `endpoints` (`@waypost/schema`, típusa `EndpointTable`) és `@waypost/schema/endpoints.json`; Composer: `Paths::endpoints()`. A fogyasztók ebből ellenőrizhetik a saját útvonaltáblájukat (backend: a route-nevek, a metódusok, az útvonalak és a `ValidateSchema` sémái; app: `src/api/endpoints.ts`). Ez a fogyasztók feladata.
  - Új végpont = új sor a táblában, ugyanabban a változtatásban, mint a sémái; különben a `validate.js` elbukik (a séma nincs használva).
- **Indok:** Így egy átnevezett vagy rossz útvonalhoz kötött séma, egy hiányzó végpont vagy egy eltérően értelmezett szűrő a fogyasztók tesztjében derül ki, nem integrációkor. Az OpenAPI 3.1 ugyanezt nagyobb leírással és új fejlesztői függőséggel adná. Ha egyszer kell (pl. külső kliens vagy Postman), a táblából generálható.
- **Érintett:** `endpoints.json`, `scripts/endpoints.js`, `scripts/endpoints.schema.json`, `scripts/validate.js`, `common/cursor.json`, `common/next-cursor.json`, `api/*.query.json`, `api/sync-pull.response.json` (`cursor` → `common/cursor.json`), `lib/index.js`, `lib/index.d.ts`, `src/Paths.php`, a backend `routes/api.php`-ja és az app `src/api/endpoints.ts`-e.

## 2026-11-04 – Kanonikus base64, pontos bájthossz (SCH-012)

- **Kérdés:** A `common/base64.json` minden kitöltőbitet elfogadott (`AA==` és `AB==` ugyanaz a bájt), és a 44 karakteres hosszkorlát 31, 32 és 33 bájtot is megengedett (a 24 karakteres 16–18-at). Hogyan legyen minden értéknek pontosan egy alakja, és a kulcs tényleg 32 bájt?
- **Döntés:**
  - `common/base64.json`: a kitöltés előtti utolsó karakter nem használt bitjei nullák (RFC 4648 3.5): `==` előtt csak `A`, `Q`, `g`, `w`, `=` előtt csak `AEIMQUYcgkosw048` állhat. A `Buffer.toString('base64')` és a `base64_encode()` mindig ilyet ír.
  - `common/bytes32-base64.json` (`^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$`): az eszköztitok (`devices-enroll.response` `secret`) és a `pin_hash`; `common/bytes16-base64.json` (`^[A-Za-z0-9+/]{21}[AQgw]==$`): a `pin_salt`. A korábbi `minLength` / `maxLength` helyett.
- **Indok:** A hosszkorlát nem garantálta, amit a leírás ígér. Egy 31 bájtos HMAC-kulcsot mindkét oldal ugyanúgy használna, így a hiba csak kézi vizsgálattal derülne ki.
- **Érintett:** `common/base64.json`, `common/bytes32-base64.json`, `common/bytes16-base64.json`, `api/devices-enroll.response.json`, `entities/user.json`; M2-02, M2-11, M3-02.

## 2026-11-04 – Kisebb szigorítások: hibaválasz, diagnosztika, korlátok, menetrend, letöltési URL (SCH-013, SCH-014, SCH-015, SCH-017, SCH-020)

- **Kérdés:** Több helyen a séma megengedőbb volt, mint a szabály, vagy a leírás ellentmondott a döntésnek. Mi a szabály?
- **Döntés:**
  - **Diagnosztika (SCH-013):** a `device-diagnostic.request` ugyanúgy köti a `code`-ot és az `expected_seq`-et, mint a push-válasz `rejected` eleme: `chain_gap` ⇔ egész, egyébként `null`. Az app ezt a push-válaszból másolja, ezért érvényes kérésnél nem változik semmi.
  - **Hibaválasz (SCH-014):** az `api/error.json` `code`-ja `common/request-error-code.json`: a 9 kérésszintű kód, a `chain_gap`, `chain_fork`, `bad_hmac` nélkül (ezek csak a push `rejected` listájában fordulnak elő). A `common/error-code.json` változatlanul mind a 12 kódot tartalmazza (a backend enumtesztje ezt veti össze). Az `error.message` és a `details` üzenetei legfeljebb 1000 karakteresek. A `details` kulcsainak nincs mintája: a backend az ismeretlen mezőt a kliens által küldött néven jelzi, a fejlécet a nevén (`Idempotency-Key`), a teljes törzset üres kulccsal.
  - **Korlátok (SCH-015):** `walk_duration_s` és `walk_time_from_prev_s` legfeljebb 86 400 (egy nap); a `route-version` `version` legfeljebb 2³¹−1, a `position` legfeljebb 500 (egy verzió legfeljebb 500 pontja); a `site_ids` legfeljebb 1000 elem; a push-válasz `media_missing` legfeljebb 1000 elem, a legrégebbiek elöl, a többi egy későbbi válaszban jön. A `1e300` így mindkét validátorban elbukik, nem a PHP float → `int` oszlop konverziójánál.
  - **Menetrend (SCH-017):** az `entities/schedule.json` leírása is `interval_to < interval_from`-ot ír az éjfélen átnyúló ablakra, és kimondja, hogy az egyenlőség érvénytelen – ahogy a `schedule-create.request`, a menetrend-vektorok `rules` mezője és a fenti menetrend-döntés. A specifikáció (`≤`) javítása a specifikáció gazdájának feladata.
  - **Letöltési URL (SCH-020):** a minta marad `^https?://`, de a leírás rögzíti, hogy az URL az API-alap sémáját és gazdáját használja: `http` csak akkor, ha maga az API is `http`-n fut (helyi hálózati fejlesztés, az app ezt `EXPO_PUBLIC_WAYPOST_API_URL`-lel támogatja), élesben soha. A `^https://` minta a helyi hálózati backenddel futó app `__DEV__` ellenőrzését törné el; a kényszerítés a backend dolga.
- **Indok:** A szerződés a backend hibás válaszát (bejegyzésszintű hibakód, 31 bájtos kulcs, korlátlan lista) a válaszsématesztben fogja meg. A határok a ténylegesen előforduló értékek nagyságrendjét követik, nem az oszloptípusét.
- **Érintett:** `api/device-diagnostic.request.json`, `api/error.json`, `common/request-error-code.json`, `api/route-version-create.request.json`, `entities/route-version.json`, `entities/route-version-checkpoint.json`, `api/user-create.request.json`, `entities/user.json`, `api/sync-push.response.json`, `entities/schedule.json`, `entities/report.json`; backend: a `media_missing` korlátja (`ChainProcessor::missingMedia()`), a hosszú üzenetek és a `http` URL élesben.

## 2026-11-04 – Egy fotóazonosító egy bejegyzésben legfeljebb egyszer (SCH-016)

- **Kérdés:** A `payload-scan` és a `payload-incident` `media` tömbjén az `uniqueItems` az egész `{ id, sha256 }` elemre vonatkozik, így ugyanaz a fotó két különböző lenyomattal is érvényes. JSON Schemában ez nem fejezhető ki. Hol legyen a szabály?
- **Döntés:** Egy bejegyzés `media` tömbjében minden `id` legfeljebb egyszer szerepel. A séma `description`-je kimondja; a lánc-ellenőrzés a sémaellenőrzés után ezt is nézi (`scripts/chain-vectors.js` `mediaIdsUnique()`, a `scripts/chain-php.sh` receptjében is), és a push `422 validation_failed`-del utasítja el. A `chain/test-vectors.json` `invalid` részének `duplicate-media-id` esete ilyen bejegyzés: a séma szerint érvényes, a lenyomata helyes, és mégis `invalid`.
- **Indok:** A hash-elt láncba került ellentmondó lenyomat utólag nem javítható: a fotó ellenőrzése (`PUT /media/{id}`) az egyikkel mindig elbukna. Az érvénytelen sémapélda nem lehet a helye, mert a séma elfogadja; a közös vektor viszont mindkét implementációt ellenőrzi.
- **Érintett:** `chain/payload-scan.json`, `chain/payload-incident.json` (leírás), `chain/test-vectors.json`, `scripts/chain-vectors.js`, `scripts/chain-php.sh`; az app és a backend lánc-ellenőrzése.

## 2026-11-04 – E-mail-cím: minta a `format` mellett, differenciális példák (SCH-018)

- **Kérdés:** A `format` kulcsszó implementációfüggő. Az opis/json-schema 2.6 és az Ajv (`ajv-formats`) egy próbán eltért: az `a@[127.0.0.1]` az opis szerint érvényes e-mail, az Ajv szerint nem. Hogyan legyen a két oldal döntése azonos?
- **Döntés:**
  - `common/email.json`: a négy e-mail-mező (`auth-login.request`, `auth-login.response`, `user-create.request`, `user-update.request`) közös sémája. A `format: email` mellett minta: ASCII helyi rész (`A-Z a-z 0-9 _ % + ' -`, pontokkal tagolva), és legalább kétcímkés domain (betű, szám, kötőjel; nemzetközi domain `xn--` alakban). Nincs idézett helyi rész, domain-literál és nem ASCII karakter. Hossz 3–255.
  - Differenciális példák, amelyeken a két validátor eltérhetne: e-mail (domain-literál, Unicode domain és helyi rész, záró sortörés, egycímkés domain, idézett helyi rész, dupla pont; érvényes: `xn--` domain, `+` és `'`), időbélyeg (záró sortörés: az opis `date-time` formátuma elfogadja, a minta nem), letöltési URL (szóköz, Unicode gazda). Az opis-paritást a CI minden példán ellenőrzi (`scripts/opis-parity.sh`, SCH-001).
  - Kipróbálva: az opis `pattern`-je a záró `\n`-t nem engedi át (`^[a-z]+$` nem illeszkedik az `abc\n`-re), ahogy JS-ben sem. A `format` önmagában viszont igen: az opis `date-time`-ja átengedi. Ezért minden `format` mellett minta is van (időbélyeg, e-mail, URL-előtag).
- **Indok:** A login-válaszban az app `__DEV__`-ben elutasítaná azt a címet, amelyet a backend elfogadott. Egy jövőbeli `format`-nál vagy opis-frissítésnél a paritásteszt jelez.
- **Érintett:** `common/email.json`, a négy e-mail-mező, `examples/common/email/`, `examples/common/timestamp/invalid/trailing-newline.json`, `examples/entities/report/invalid/url-with-*.json`.

## 2026-11-04 – Az érvénytelen példák várt hibája (SCH-021)

- **Kérdés:** A `validate.js` csak azt nézte, hogy az érvénytelen példa elbukik-e. Ha egy sémaváltozás után más okból bukik el, a teszt zöld marad, a szándékolt szabály viszont már nincs ellenőrizve. Hogyan legyen az ok is gépi ellenőrzés?
- **Döntés:**
  - Sémánként egy `examples/<séma útvonala>/expected-errors.json`: érvénytelen példánként (a fájlnév `.json` nélkül) a várt hiba `{ "path": <JSON Pointer>, "keyword": <Ajv-kulcsszó>, "property"?: <mező> }` alakban, vagy ezek listája, ha a példa egyetlen hibája két jelzést ad (pl. egy mező másik néven: `required` + `additionalProperties`). A `property` a `required`, az `additionalProperties` és a `dependentRequired` hibánál a mező neve.
  - A `validate.js` minden érvénytelen példánál ellenőrzi, hogy az Ajv hibái között ott van-e mindegyik várt hiba. Elbukik, ha egy példának nincs bejegyzése, ha más okból bukik el, ha a bejegyzés hibás alakú, ha a fájl nem létező példát nevez meg, vagy ha a fájl hiányzik. A hibaüzenet a példa tényleges hibáit is kiírja, bejegyzés alakban, hogy a szerző kimásolhassa.
  - A bejegyzéseket az Ajv akkori hibáiból vettem fel, és egyenként összevetettem a fájlnevekkel. A többes hibájú példák (az `anyOf` / `null`-ág zaja, a szó szerinti specifikációs példák) a fájlnévben megnevezett okot kapták.
  - Az opis nem nézi a várt hibát (a hibafája más alakú), csak azt, hogy a példa elbukik-e. Az `expected-errors.json` nem példa: az opis-paritás és a backend globja (`examples/api/*.request/*/*.json`) nem látja.
- **Indok:** Így a „csendben elveszett szabály” a `npm test`-ben derül ki. A fájlnévkonvenció (pl. `pattern--tag-uid.json`) olvashatatlanná tette volna a neveket, a példánkénti kísérőfájl megduplázta volna a fájlok számát.
- **Érintett:** `scripts/validate.js`, `scripts/validate.test.js`, `scripts/opis-parity.sh`, `examples/*/*/expected-errors.json`.

## 2026-11-04 – A példák a csomag részei (SCH-011)

- **Kérdés:** A Composer `archive.exclude` kizárta az `examples/`-t, a backend tesztjei viszont a `Paths::root() . '/examples/...'` fájlokat olvassák. `path` + szimlink mellett ez működik, egy archívumból (VCS-tag zip, privát Packagist) telepített csomagból viszont hiányozna. Mi legyen?
- **Döntés:** Az `examples/` a Composer-archívumban marad, és a `Paths::examplesDirectory()` adja az útvonalát. A `scripts/composer-smoke.sh` a `composer archive` kimenetéből is telepít, és ellenőrzi, hogy a példák ott vannak. Az npm-csomag nem tartalmazza őket: az app nem olvassa.
- **Indok:** A példák a szerződés futtatható részei: a fogyasztó a saját validátorán futtathatja őket. Saját fixture-ök a backendben a közös példák másolatai lennének.
- **Érintett:** `composer.json`, `src/Paths.php`, `scripts/composer-smoke.sh`; a backend tesztjei a `Paths::examplesDirectory()`-t használhatják a `Paths::root() . '/examples'` helyett.

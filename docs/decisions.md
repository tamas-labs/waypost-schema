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

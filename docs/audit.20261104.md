# Waypost Schema – szigorú, teljes körű kódminőségi, séma- és architekturális audit

## Szerepkör

Senior software architect, API contract specialist, JSON Schema expert és senior TypeScript/PHP engineer szerepében dolgozol.

A feladatod a `waypost-schema` repository teljes körű, szigorú és kritikus auditja.

Ez a repository a Waypost rendszer három különálló csomagja közül a központi szerződésréteg. A mobilalkalmazás (`waypost`) és a Laravel backend (`laravel-waypost`) egyaránt ezt használja. Emiatt egy hibás, hiányos vagy kétértelmű séma mindkét alkalmazás működését veszélyeztetheti.

Az audit célja nem pusztán annak megállapítása, hogy a sémák szintaktikailag érvényesek-e. Azt is vizsgálnod kell, hogy a szerződések pontosak, következetesek, biztonságosak, verziózhatók, jól tesztelhetők és hosszú távon karbantarthatók-e.

**Legyél szigorú. Ne fogadj el egy megoldást pusztán azért, mert jelenleg működni látszik.**

---

## 1. Vizsgálandó repository és kapcsolódó források

Elsődleges célpont:

- `waypost-schema`

Kapcsolódó repository-k:

- `waypost` – Expo / React Native mobilalkalmazás.
- `laravel-waypost` – Laravel 13 / PHP 8.4 backend.

Továbbá használd a projekt fejlesztői specifikációját, amely a Waypost rendszer első lépcsőjének követelményeit tartalmazza.

A kapcsolódó repository-kat ne auditáld teljes körűen. Kizárólag azt vizsgáld, hogy a `waypost-schema` által meghatározott szerződéseket helyesen és következetesen használják-e.

Ha valamelyik kapcsolódó repository nem érhető el, ezt rögzítsd. Ne következtess nem látott forráskódra.

### A specifikáció szerinti repository-struktúra

```text
waypost-schema/
  CLAUDE.md
  package.json
  composer.json
  schemas/
    entities/
    api/
    chain/
  chain/
    test-vectors.json
  schedule/
    test-vectors.json
  examples/
  scripts/
  CHANGELOG.md
```

A specifikáció szerint:

- JSON Schema Draft 2020-12 az alap.
- A sémák tartalmazzák az API kéréseit, válaszait, az entitásokat és a láncbejegyzéseket.
- A csomag npm-csomagként `@waypost/schema` néven érhető el.
- A csomag Composer-csomagként `waypost/schema` néven érhető el.
- A TypeScript-típusokat a sémákból kell generálni, a specifikációban megjelölt `json-schema-to-typescript` eszközzel.
- A lánc és a menetrend működéséhez közös tesztvektorok tartoznak.
- Minden sémához érvényes és érvénytelen példákat kell biztosítani.
- A sémaellenőrzésnek CI-ben is le kell futnia.
- A változásokat a `CHANGELOG.md` dokumentálja, SemVer szerint.
- Törő változás esetén új major verzió és új `/vN` API-verzió szükséges.

Ezeket a követelményeket tekintsd az audit alapjának.

Ha a repository tényleges állapota eltér a specifikációban leírt struktúrától, ne feltételezd automatikusan, hogy ez hiba. Vizsgáld meg, hogy a megvalósítás funkcionálisan és architekturálisan teljesíti-e a követelményt, majd dokumentáld az eltérést.

---

## 2. Az audit alapelvei

1. Ne módosítsd a forráskódot.
2. Ne végezz refaktorálást.
3. Ne javítsd ki a talált hibákat.
4. Ne frissíts vagy telepíts függőségeket.
5. Ne módosítsd a `package-lock.json`, `composer.lock` vagy más lock fájlokat.
6. Ne módosítsd a publikus API-t vagy a sémákat.
7. Ne készíts automatikus kódgenerálást, ha az felülírhat meglévő fájlokat.
8. Ne futtass olyan parancsot, amely adatvesztést vagy repository-módosítást okozhat.
9. Ne tekints egy hibát bizonyítottnak pusztán azért, mert egy ellenőrzés nem futtatható.
10. Ne találj ki új követelményeket. Különítsd el a specifikációban szereplő kötelező elvárásokat az általad javasolt fejlesztésektől.

Az audit során minden lényeges megállapítást konkrét bizonyítékkal támassz alá.

**Minden hibához adj meg pontos fájlnevet és sorszámot.** Ha a hiba több fájlt érint, mindegyiket sorold fel.

Ha egy ellenőrzés nem végezhető el, dokumentáld:
- mit szerettél volna ellenőrizni;
- miért nem sikerült;
- milyen következtetés vonható le, és mi az, ami nem állapítható meg.

Ne állítsd, hogy egy teszt sikeres, ha valójában nem futott le.

---

# 3. Részletes auditterületek

## A. Repository-struktúra és csomagfelépítés

Vizsgáld meg:

- A repository struktúrája logikus és következetes-e.
- A fájlok elhelyezése megfelel-e a felelősségi köröknek.
- A `schemas/entities`, `schemas/api` és `schemas/chain` elkülönítése megfelelő-e.
- A tesztvektorok és példák elhelyezése, elnevezése következetes-e.
- A generálási és ellenőrzési scriptek felelősségi köre világos-e.
- Vannak-e felesleges, elavult, árva vagy duplikált fájlok.
- Vannak-e olyan sémák, amelyek több helyen eltérő definícióban szerepelnek.
- A repository tartalmaz-e olyan generált fájlokat, amelyek forrása nem egyértelmű.

Vizsgáld meg azt is, hogy a repository valóban egy központi szerződésrétegként működik-e, vagy bizonyos üzleti logikák véletlenül az egyik fogyasztó alkalmazásba kerültek.

## B. JSON Schema minőség és helyesség

Ez az audit egyik legfontosabb része.

Ellenőrizd valamennyi JSON Schema fájlt.

### Draft és szabványosság

- Minden séma a megfelelő JSON Schema Draft 2020-12 verziót használja-e.
- A `$schema` és `$id` mezők következetesek-e.
- A `$ref`, `$defs`, `allOf`, `oneOf`, `anyOf`, `not` és egyéb konstrukciók helyesen vannak-e használva.
- A hivatkozások feloldhatók-e.
- Nincs-e körkörös vagy hibás referencia.
- A sémák önmagukban és együtt is validálhatók-e.
- A metaadatok és azonosítók konzisztensen vannak-e meghatározva.

### Adattípusok és validáció

Minden mezőnél vizsgáld:

- a megfelelő adattípust;
- kötelező és opcionális mezők helyes elkülönítését;
- `null` megengedettségét;
- `enum` és `const` használatát;
- string hosszkorlátokat;
- számértékek minimumát és maximumát;
- tömbök elemszámkorlátait;
- objektumok kötelező tulajdonságait;
- `additionalProperties` és `unevaluatedProperties` használatát;
- dátumok, időpontok, UUID-k és egyéb formátumok validációját.

Különösen figyelj az olyan esetekre, amikor a séma látszólag validál, de valójában túl sok hibás adatot is elfogad.

Vizsgáld meg azt is, hogy a sémák nem túl szigorúak-e, vagyis nem utasítanak-e el olyan érvényes adatot, amelyet a specifikáció megenged.

### Entitások

Ellenőrizd az entitássémákat, különösen:

- site;
- user;
- checkpoint;
- route;
- route-version;
- schedule;
- további, a repository-ban megtalálható entitások.

Vizsgáld meg:

- Az entitások mezői következetesek-e.
- Az azonosítók formátuma egységes-e.
- A kapcsolódó entitások hivatkozásai helyesek-e.
- A létrehozási és módosítási időpontok reprezentációja egységes-e.
- A szerver által kezelt és kliens által küldött mezők elkülönülnek-e.
- A státuszok és állapotok értékkészletei következetesek-e.
- A törölt, inaktív vagy archivált állapotok reprezentációja egyértelmű-e.
- A mezők elnevezése és jelentése nem változik-e entitásonként indokolatlanul.

Keresd azokat az eseteket, amikor két különböző séma ugyanazt a fogalmat eltérő mezőnévvel vagy eltérő adattípussal reprezentálja.

## C. API request és response szerződések

Vizsgáld meg az összes API-sémát a `schemas/api` alatt.

Minden végpontnál ellenőrizd:

- Létezik-e request séma.
- Létezik-e response séma.
- A request mezői megfelelnek-e a végpont céljának.
- A response mezői egyértelműek és következetesek-e.
- A sikeres és sikertelen válaszok formátuma egységes-e.
- A lapozás, szűrés és rendezés szerződése következetes-e.
- A hibaválaszok egységes struktúrát követnek-e.
- A státuszkódok és az üzleti hibakódok összhangban vannak-e.
- A dátumok, azonosítók és státuszok formátuma egységes-e.
- A nullable mezők használata egyértelmű-e.
- Nincs-e olyan mező, amelyet a kliens küld, de a backend figyelmen kívül hagy vagy máshogy értelmez.
- Nincs-e olyan response mező, amelyet a kliens elvár, de a backend nem szolgáltat.

Vizsgáld meg a teljes API-t mint egységes szerződést is.

Keresd a következő problémákat:

- Azonos jelentésű, de eltérő formátumú requestek.
- Eltérő response-struktúrák hasonló végpontoknál.
- Eltérő hibaformátumok.
- Hiányzó vagy félreérthető mezők.
- Nem egyértelmű opcionális mezők.
- Túlzottan általános sémák.
- Indokolatlanul megengedő sémák.
- Olyan mezők, amelyek jelentése csak a backend vagy a mobilapp kódjából derül ki.

## D. Láncbejegyzések és kriptográfiai szerződés

Kiemelt prioritású terület.

A Waypost eseményláncának formátuma kritikus adatkonzisztencia- és integritási követelmény.

Vizsgáld meg:

- A `schemas/chain` sémáit.
- Az `entry.json` és a különböző payload sémákat.
- Az eseménytípusok értékkészletét.
- A kötelező és opcionális mezőket.
- A láncbejegyzések azonosítóit.
- A `seq`, `prev_hash`, `hash` és egyéb integritási mezők definícióját.
- A HMAC-SHA256-hoz kapcsolódó adatformátumot.
- A kanonikus JSON reprezentációhoz szükséges szerződéseket.
- A timestamp, monotonic time és boot ID mezők jelentését.
- A payload típusok közötti eltéréseket és közös mezőket.
- A `null` értékek kezelésének egyértelműségét.

A specifikáció szerint a lánc kanonikus JSON reprezentációja RFC 8785 szerinti, HMAC-SHA256 alapú, a null mezőket meg kell tartani, float értékek nem használhatók.

Ellenőrizd, hogy a sémák ezt megfelelően támogatják-e.

**Fontos:** a JSON Schema önmagában nem feltétlenül képes minden kriptográfiai vagy kanonizálási invariáns ellenőrzésére. Különítsd el:
- amit a séma képes garantálni;
- amit a generáló vagy validáló kódnak kell garantálnia;
- amit a tesztvektoroknak kell bizonyítaniuk.

Ne minősítsd hibának a séma hiányosságát olyan szabály esetén, amelyet bizonyíthatóan más, megfelelő réteg ellenőriz. Viszont jelezd, ha az invariáns sehol sincs garantálva.

Vizsgáld meg, hogy a payload-sémák minden eseménytípushoz megfelelően specifikusak-e, és nem engednek-e át egymással összekeverhető vagy hiányos eseményeket.

## E. Közös tesztvektorok

Kiemelt prioritású terület.

Vizsgáld meg:

- `chain/test-vectors.json`
- `schedule/test-vectors.json`

### Láncteszt-vektorok

A specifikáció szerint a lánc tesztvektorok bemenetet, `canonical_json` értéket és hash példákat tartalmaznak.

Ellenőrizd:

- Minden vektor teljes és egyértelmű-e.
- A bemenetből valóban a megadott kanonikus JSON állítható-e elő.
- A kanonizálás megfelel-e az RFC 8785-nek.
- A hash értékek matematikailag helyesek-e a megadott bemenet és algoritmus alapján.
- A null mezők megmaradnak-e.
- A mezősorrend és az escape-elés helyes-e.
- Vannak-e szélsőértékek és hibás bemenetek.
- A tesztvektorok alkalmasak-e arra, hogy PHP és TypeScript implementáció ugyanazt az eredményt adja.

Ne elégedj meg a fájl JSON-szintű validálásával. A számolható tesztvektorokat függetlenül is ellenőrizd, ha erre rendelkezésre állnak a szükséges információk és biztonságosan futtatható eszközök.

### Menetrend-tesztvektorok

A schedule tesztvektorok a menetrend és dátum alapján elvárt köröket határozzák meg.

Vizsgáld:

- A normál hétköznapokat.
- A hétvégi eseteket.
- A hét napjaihoz kapcsolódó határokat.
- Az éjfélen átnyúló menetrendeket.
- A kezdő naphoz rendelés szabályát.
- A hónap- és évváltást.
- A nyári és téli időszámításra való átállást.
- A nem létező és kétszer előforduló helyi időpontokat.
- A telephely időzónájának szerepét.
- A várt időpontok pontos reprezentációját.

A specifikáció szerint például a hétfő 20:00 és kedd 08:00 közötti körök a hétfői kezdő naphoz tartoznak.

Vizsgáld meg, hogy a tesztvektorok valóban lefedik-e a PHP és TypeScript implementációk közötti legfontosabb eltérési lehetőségeket.

Ha a specifikáció nem határoz meg egy szélső esetet, ne találj ki kötelező viselkedést. Jelezd, hogy döntést igénylő specifikációs hiányról van szó.

## F. Érvényes és érvénytelen példák

Vizsgáld meg az `examples/` könyvtárat.

Követelmény: minden sémához legyen érvényes és érvénytelen mintapéldány.

Ellenőrizd:

- Minden sémához tartozik-e példa.
- Az érvényes példák valóban megfelelnek-e a sémának.
- Az érvénytelen példákat a séma valóban elutasítja-e.
- Az érvénytelen példák konkrét hibákat modelleznek-e.
- A példák nem duplikálják-e indokolatlanul egymást.
- A fájlnevek és a sémák közötti megfeleltetés egyértelmű-e.
- A példák a valós API-használatot reprezentálják-e.
- A példák alkalmasak-e dokumentációs és integrációs célokra.

Különösen keresd azokat az eseteket, amikor egy hibás példa azért érvénytelen, mert hibás a JSON, nem pedig azért, mert a séma helyesen utasítja el az üzletileg hibás adatot.

## G. TypeScript-típusgenerálás

Vizsgáld meg a `package.json` fájlt és a generálási scripteket.

A specifikáció szerint a TypeScript-típusok a JSON Schema definíciókból generálódnak.

Ellenőrizd:

- A `json-schema-to-typescript` megfelelő használatát.
- A generálási konfigurációt.
- A generált típusok és a forrássémák egyezőségét.
- A nullable mezők reprezentációját.
- Az opcionális mezők reprezentációját.
- Az enumok és union típusok helyességét.
- A `$ref` hivatkozások típusgenerálását.
- A generált típusok elnevezését.
- A névütközéseket.
- A típusok exportálását.
- A generált fájlok determinisztikusságát.
- A generálás megismételhetőségét.
- A kézzel módosított generált fájlok kockázatát.
- A generálás és a CI ellenőrzés összhangját.

Vizsgáld meg, hogy a TypeScript-típusok nem engednek-e meg több értéket, mint a JSON Schema, illetve nem korlátoznak-e indokolatlanul olyan értékeket, amelyeket a séma megenged.

Külön figyelj arra, hogy a TypeScript-típusok önmagukban nem futásidejű validációk. A két mechanizmus szerepét ne keverd össze.

## H. PHP / Composer kompatibilitás

A csomag Composer-csomagként is elérhető.

Vizsgáld meg:

- A `composer.json` helyességét.
- A csomagazonosítót.
- A PHP-verziókövetelményeket.
- Az autoload beállításokat.
- A sémák Composer-csomagon belüli elérhetőségét.
- A Laravel backend általi felhasználhatóságot.
- A JSON Schema validálásához szükséges fájlok és hivatkozások elérhetőségét.
- A Composer-csomag telepítése után a sémák ténylegesen megtalálhatók-e.
- A Composer és npm csomag tartalma megfelel-e egymásnak.

A specifikáció szerint a Laravel backend az `opis/json-schema` csomaggal ellenőrzi a bemenő JSON-t.

Vizsgáld meg, hogy a `waypost-schema` által használt JSON Schema konstrukciók kompatibilisek-e a backendben alkalmazott validátorral. Ha a pontos verzió vagy implementáció nem állapítható meg, ezt dokumentáld, és ne állíts bizonyítatlan kompatibilitást.

## I. NPM és Composer csomagolás összhangja

A repository egyszerre két csomagkezelő ökoszisztémát szolgál ki.

Ez különösen fontos auditterület.

Ellenőrizd:

- Az npm és Composer csomag ugyanazokat a sémákat tartalmazza-e.
- Nincs-e eltérés a két csomagban található fájlok között.
- A csomagok verziószáma összhangban van-e.
- A publikálási folyamat nem hagy-e ki fontos fájlokat.
- A `.npmignore`, `.gitignore` és Composer `archive`/`exclude` beállítások helyesek-e.
- A telepített csomagokban ténylegesen elérhetők-e a szükséges fájlok.
- A fogyasztó alkalmazások ugyanazt a szerződésverziót kapják-e.
- A csomagok publikálása reprodukálható-e.

Vizsgáld meg azt is, hogy a csomag kétféle telepítési módja nem eredményezhet-e eltérő sémakészletet.

## J. Verziózás és visszafelé kompatibilitás

A `CHANGELOG.md` és a csomagverziók alapján vizsgáld meg a verziózási stratégiát.

A specifikáció szerint:

- SemVer verziózást kell használni.
- Törő változás esetén új major verzió szükséges.
- Törő változás esetén új `/vN` API-verzió szükséges.

Ellenőrizd:

- A verziószámok és a changelog összhangját.
- A változások megfelelő dokumentálását.
- A breaking change-ek felismerését.
- Az API-verzió és a csomagverzió kapcsolatát.
- A régi verziók kezelhetőségét.
- A kompatibilitási szabályokat.
- A mobilalkalmazás és backend eltérő frissítési ciklusának kockázatait.

Külön vizsgáld meg, hogy egy új mező hozzáadása, egy enum bővítése, egy mező opcionálissá tétele, egy mező törlése vagy típusának megváltoztatása milyen kompatibilitási hatással jár.

Ne feltételezd automatikusan, hogy minden mezőbővítés kompatibilis. Vizsgáld meg a fogyasztók validációs és deszerializációs viselkedését is.

## K. A mobilalkalmazás és a backend szerződésének egyezősége

Ez az audit egyik legfontosabb integrációs területe.

A `waypost-schema` az egyetlen közös szerződésréteg a két alkalmazás között.

Ellenőrizd a `waypost` és `laravel-waypost` repository-kban, hogy:

- A mobilalkalmazás a megfelelő generált TypeScript-típusokat használja-e.
- A backend a megfelelő JSON Schema-kat használja-e.
- Minden API request megfelel-e a központi sémának.
- Minden API response megfelel-e a központi sémának.
- A backend nem használ-e olyan mezőt, amely nincs a sémában.
- A mobilalkalmazás nem vár-e olyan mezőt, amely nincs a sémában.
- A két alkalmazás ugyanazt jelenti-e az egyes mezők alatt.
- A hibaválaszok kezelése összhangban van-e.
- A dátum- és időzóna-kezelés konzisztens-e.
- Az enumok és státuszok értékei megegyeznek-e.
- A chain entry formátum mindkét oldalon azonos-e.
- A schedule tesztvektorokat mindkét oldal ténylegesen használja-e.

Ahol lehetséges, készíts végpont–request–response megfeleltetési táblázatot.

A cél annak feltárása, hogy a három repository ténylegesen ugyanazt a szerződést valósítja-e meg.

## L. Biztonsági és adatvédelmi vizsgálat

Vizsgáld meg, hogy a sémák megfelelően korlátozzák-e a bemenő adatokat.

Különösen:

- Túlzottan megengedő string mezők.
- Korlátlan hosszúságú szövegek.
- Váratlan objektumtulajdonságok elfogadása.
- Nem megfelelő enumok.
- Hibás azonosítók.
- Nem megfelelő fájl- és média-metaadatok.
- Nem egyértelmű URL-mezők.
- Érzékeny adatok indokolatlan továbbítása.
- Tömeges adatküldés korlátozásának hiánya.
- Olyan mezők, amelyek kliensoldali manipulációval jogosultsági vagy adatkonzisztencia-problémát okozhatnak.

Vizsgáld meg, hogy a sémák elválasztják-e a kliens által küldhető és a szerver által kezelt adatokat.

A JSON Schema nem helyettesíti az autentikációt, jogosultságkezelést vagy üzleti validációt. Ezeket ne várd el a sémától, de jelezd, ha a szerződés nem teszi egyértelművé a határokat.

## M. Kódminőség, Clean Code és karbantarthatóság

Vizsgáld meg a repository-ban található scripteket, konfigurációkat és segédkódokat is.

Értékeld:

- Clean Code.
- SOLID, ahol releváns.
- DRY.
- KISS.
- Egyértelmű elnevezések.
- Kis és jól körülhatárolt felelősségű scriptek.
- Ismétlődő logika.
- Felesleges absztrakciók.
- Rejtett függőségek.
- Nehezen tesztelhető megoldások.
- Túlzott komplexitás.
- Hibakezelés.
- Naplózás.
- Determinisztikus működés.

Külön vizsgáld meg, hogy a sémák szerkezete mennyire támogatja a későbbi bővítést anélkül, hogy felesleges komplexitást vezetne be.

## N. Tesztelés és CI

Vizsgáld meg az összes tesztet és CI konfigurációt.

Ellenőrizd:

- Minden séma validálása automatikusan történik-e.
- Minden érvényes példa elfogadásra kerül-e.
- Minden érvénytelen példa elutasításra kerül-e.
- A tesztvektorok automatikusan ellenőrzöttek-e.
- A TypeScript-generálás konzisztenciája ellenőrzött-e.
- A csomagok tartalma egyezik-e.
- A CI minden szükséges ellenőrzést lefuttat-e.
- A tesztek determinisztikusak-e.
- Vannak-e szélsőértékeket vizsgáló tesztek.
- A hibás hivatkozások és hiányzó sémák felismerhetők-e.
- A tesztlefedettség megfelelő-e az egyedi scriptek esetében.

Külön értékeld, hogy a CI képes-e megakadályozni egy hibás vagy inkompatibilis séma publikálását.

## O. Dokumentáció

Vizsgáld meg:

- README.
- CHANGELOG.
- CLAUDE.md.
- Telepítési és használati dokumentáció.
- Verziózási szabályok.
- Típusgenerálás leírása.
- Validálási példák.
- Tesztvektorok dokumentációja.
- npm és Composer használati útmutató.

Ellenőrizd, hogy egy új fejlesztő a dokumentáció alapján képes-e:
- megérteni a repository szerepét;
- új sémát létrehozni;
- új API-szerződést hozzáadni;
- típusokat generálni;
- teszteket futtatni;
- a csomagot mindkét ökoszisztémában használni;
- kompatibilis változtatást készíteni.

---

# 4. Architekturális jövőállóság – második fejlesztési lépcső

A Waypost második lépcsőjének funkcióit most nem kell megvalósítani.

Ezek közé tartozik:
- élő követés;
- SOS;
- diszpécser;
- élő riasztások.

Vizsgáld meg, hogy a jelenlegi sémák és adatstruktúrák lehetővé teszik-e ezek későbbi bevezetését anélkül, hogy a jelenlegi szerződésréteget alapjaiban újra kellene tervezni.

Ne javasolj előre megvalósítást, ha erre nincs szükség. A cél az, hogy a jelenlegi architektúra ne zárja ki indokolatlanul a későbbi bővítést.

---

# 5. Súlyossági besorolás

Minden megállapítást az alábbi kategóriák egyikébe sorolj.

| Szint | Jelentés |
|---|---|
| CRITICAL | Adatvesztéshez, integritássérüléshez, súlyos biztonsági problémához vagy a rendszer alapvető működésképtelenségéhez vezethet. |
| HIGH | Jelentős kompatibilitási, szerződésbeli, adatkonzisztencia- vagy működési probléma. |
| MEDIUM | Korlátozottabb működési hiba, karbantarthatósági vagy bővíthetőségi probléma. |
| LOW | Kisebb minőségi, dokumentációs vagy konzisztenciaprobléma. |
| INFO | Fejlesztési javaslat, megfigyelés vagy jövőbeli kockázat. |

Minden hibához add meg:

1. Egyedi azonosító, például `SCH-001`.
2. Rövid, egyértelmű cím.
3. Súlyosság.
4. Érintett fájl(ok) és pontos sorszám(ok).
5. A probléma részletes leírása.
6. Miért probléma?
7. Milyen következménye lehet?
8. Konkrét javítási javaslat.
9. Bizonyosság: bizonyított / erősen valószínű / feltételezés.
10. Melyik követelményhez vagy auditterülethez kapcsolódik.

Ne minősíts minden eltérést hibának. Különböztesd meg:
- a tényleges hibát;
- a specifikációtól való eltérést;
- a dokumentáció hiányát;
- a technikai adósságot;
- a fejlesztési javaslatot.

---

# 6. Kimeneti dokumentumok

Három külön Markdown fájlt hozz létre a `waypost-schema` repository gyökérkönyvtárában.

**A fájlokat kizárólag az audit eredményének dokumentálására hozd létre. A forráskódot és a meglévő konfigurációkat ne módosítsd.**

## 1. `AUDIT-REPORT.md`

Átfogó auditjelentés.

Tartalma:

1. Vezetői összefoglaló.
2. Az audit hatóköre és módszertana.
3. Vizsgált repository-struktúra.
4. Általános architekturális értékelés.
5. JSON Schema minőség.
6. API-szerződések minősége.
7. Láncformátum és tesztvektorok értékelése.
8. Menetrend-tesztvektorok értékelése.
9. TypeScript-generálás értékelése.
10. PHP / Composer kompatibilitás.
11. npm / Composer csomagolás.
12. Verziókezelés és visszafelé kompatibilitás.
13. Mobilalkalmazás és backend szerződésének egyezősége.
14. Biztonsági értékelés.
15. Tesztelés és CI.
16. Dokumentáció.
17. Clean Code és karbantarthatóság.
18. Második lépcsőre való felkészültség.
19. Pozitívumok és jól megvalósított megoldások.
20. Fő kockázatok.
21. Összesített minősítés.
22. Prioritásos javítási javaslatok.

Ne csak a hibákat sorold fel. A jól megvalósított, értékes architekturális döntéseket is emeld ki.

## 2. `AUDIT-ISSUES.md`

Részletes hibajegyzék.

A hibákat súlyosság szerint csoportosítsd:

- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFO

Minden hibát a fent meghatározott formátumban dokumentálj.

A fájl elején legyen összesítő táblázat:

| Súlyosság | Hibák száma |
|---|---:|
| CRITICAL | |
| HIGH | |
| MEDIUM | |
| LOW | |
| INFO | |
| **Összesen** | |

A hibákat úgy írd le, hogy egy fejlesztő további magyarázat nélkül megértse a problémát, meg tudja találni az érintett kódot, és végre tudja hajtani a javítást.

Ne duplikáld ugyanazt a problémát több hibaként, kivéve, ha különálló következményekről van szó.

## 3. `AUDIT-COMPLIANCE.md`

Specifikációs megfelelőségi mátrix.

A dokumentum célja, hogy minden releváns specifikációs követelmény esetében egyértelmű legyen a megfelelőség.

Használd az alábbi státuszokat:

- PASS – teljes mértékben megfelel.
- PARTIAL – részben teljesül.
- FAIL – nem teljesül.
- NOT VERIFIED – nem volt ellenőrizhető.
- NOT APPLICABLE – nem releváns.

Javasolt táblázat:

| ID | Követelmény | Elvárt viselkedés | Megvalósítás helye | Státusz | Megjegyzés |
|---|---|---|---|---|---|

Térj ki legalább az alábbiakra:

- JSON Schema Draft 2020-12.
- Entitássémák.
- API request és response sémák.
- Hibaválasz-séma.
- Láncbejegyzések és payloadok.
- RFC 8785-nek megfelelő kanonikus JSON szerződés.
- HMAC-SHA256-hoz szükséges mezők és formátum.
- Null mezők megőrzése.
- Float értékek kizárása a láncban.
- Láncteszt-vektorok.
- Menetrend-tesztvektorok.
- Érvényes és érvénytelen példák minden sémához.
- TypeScript-típusgenerálás.
- npm csomag.
- Composer csomag.
- SemVer.
- Breaking change esetén új major és új `/vN` API.
- CI sémaellenőrzés.
- Mobilapp és backend közös szerződése.

A megfelelőségi mátrixban ne adj PASS státuszt pusztán azért, mert létezik egy fájl. A tényleges működést és tartalmat vizsgáld.

---

# 7. Az audit végrehajtásának ajánlott sorrendje

A munkát az alábbi sorrendben végezd:

1. Repository-struktúra és konfiguráció feltérképezése.
2. A specifikáció releváns követelményeinek azonosítása.
3. Minden JSON Schema szintaktikai és szemantikai ellenőrzése.
4. Referenciák és függőségek ellenőrzése.
5. Entitás- és API-szerződések részletes vizsgálata.
6. Láncformátum és tesztvektorok ellenőrzése.
7. Menetrend-tesztvektorok ellenőrzése.
8. Érvényes és érvénytelen példák validálása.
9. TypeScript-típusgenerálás ellenőrzése.
10. npm és Composer csomagolás ellenőrzése.
11. Verziózás és changelog vizsgálata.
12. Mobilalkalmazással való összehasonlítás.
13. Backenddel való összehasonlítás.
14. Biztonsági és karbantarthatósági vizsgálat.
15. CI és dokumentáció ellenőrzése.
16. Hibák súlyosság szerinti besorolása.
17. A három auditdokumentum elkészítése.

Ahol lehetséges, használj automatizált ellenőrzéseket, de ne hagyatkozz kizárólag rájuk.

A tesztelés során a meglévő környezetet használd. Ne telepíts új csomagokat, és ne módosítsd a lock fájlokat.

---

# 8. Végső ellenőrzés

A jelentések elkészítése előtt ellenőrizd:

- Minden talált probléma szerepel-e az `AUDIT-ISSUES.md` fájlban.
- Az összesített hibaszám helyes-e.
- A súlyossági besorolások következetesek-e.
- Minden hibához van-e pontos fájl- és sorszám.
- A compliance mátrix minden releváns követelményt tartalmaz-e.
- A jelentés nem állít-e olyat, amit az audit során nem ellenőriztél.
- A pozitívumok és a negatívumok egyaránt szerepelnek-e.
- A három dokumentum egymással összhangban van-e.
- A jelentések nem tartalmaznak-e egymásnak ellentmondó megállapításokat.

**A legfontosabb:** ne próbáld szépíteni az eredményt. Ha a közös szerződésréteg hibás, hiányos vagy nem alkalmas arra, hogy két különböző technológiai stack megbízhatóan használja, azt egyértelműen mondd ki.

---

# 9. Audit utáni összefoglaló

A munka végén a terminálban is adj rövid összefoglalót:

- Audit sikeresen befejeződött-e.
- Létrejött-e mindhárom dokumentum.
- Hány CRITICAL, HIGH, MEDIUM, LOW és INFO probléma került elő.
- Mi a három legsúlyosabb megállapítás.
- Mely területeket nem sikerült ellenőrizni.
- Milyen sorrendben javaslod a javításokat.

**Ne javítsd ki a talált hibákat. Az audit lezárása után várd meg a további utasítást.**

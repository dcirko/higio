# Suplementi — ishod i faze do stabilnog Androida

Datum završne provjere: 11. rujna 2026.

## Što je napravljeno

Suplementi su uklopljeni u postojeći lokalni tok, bez zasebne navigacije ili
backenda. Dodana je kategorija s ikonom 💊 i ljubičastim predlošcima:

| Aktivnost | Dnevna doza | Broj planiranih termina dnevno |
| --- | --- | --- |
| Kreatin | 3 tablete | 1 |
| Magnezij | 1 tableta | 1 |
| Omega-3 | 1 tableta | 1 |
| Multivitamin | 1 tableta | 1 |

Jedan dodir evidentira cijelu dozu. Koriste se postojeća potvrda i Poništi,
povijest, naknadni unos te 7/30-dnevna statistika. Doza se vidi u predlošcima,
popisu aktivnosti, kartici Danas i povijesti; može se uređivati uz raspored.

Promjena doze vrijedi od sutra prema pravilima verzioniranja rasporeda.
Izvršenje čuva vlastitu oznaku doze. Naknadni unos koristi dozu važeću na
odabrani lokalni datum; promjena vremena već spremljenog zapisa ne prepisuje
njegovu dozu. Nema medicinskih preporuka ili automatske promjene količine.

Migracija 0002 dodaje nullable dose_label rasporedu i izvršenju. Backup format
2 / schema 3 čuva doze, a stari format 1 / schema 2 strogo se provjerava i
pretvara uz null dozu starih zapisa. Očuvani su limit 5 MB, pregled prije
uvoza, potvrda zamjene i atomska transakcija.

## Provjere

- TypeScript strict, ESLint bez upozorenja i Prettier prolaze.
- Jest: 13 paketa / 53 testa prolazi.
- Stvarni SQLite engine na računalu provjerava repozitorije, dose history,
  naknadni unos, sprečavanje duplikata, undo, statistiku, export/restore i
  rollback pri namjerno izazvanoj grešci uvoza.
- UI test potvrđuje prikaz doze kreatina, jedan dodir i Poništi.
- Expo konfiguracija i Android prebuild prolaze; iOS konfiguracija ostaje.
- Android/Hermes export prolazi: 2.034 modula, bundle približno 5,2 MB,
  spremljen u apps/mobile/.expo/verification/android-export. Prvi pokušaj
  blokirao je sandbox pri pokretanju hermesc.exe; ponovljena provjera uz
  odobren pristup završila je uspješno.
- Android ARM64 debug APK: uspješan build, paket com.domag.higio.dev,
  verzija 0.1.0, 94.342.315 bajtova. Build nije production potpisana verzija.

APK je u apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk.
SHA-256: 57453B98360C51268E526DD4855517C8C8B534E1AE1E90408E42E264B0C135BF.
Build log je u apps/mobile/.expo/verification/android-arm64-debug-build.log.

Expo provjera ovisnosti prijavljuje novije SDK 57 patch verzije. Nadogradnja
ovisnosti nije uključena u ovu promjenu i zahtijeva ponovnu provjeru native
modula. Uspješan build nije dokaz rada na fizičkom mobitelu. adb 11. rujna
ne prikazuje priključeni uređaj.

## Iduće faze

1. **Fizički Android:** spojiti uređaj, instalirati development APK, pokrenuti
   Metro i provjeriti ključne tokove prema SUPPLEMENTS_PLAN.md. Posebno
   SQLite trajnost, haptiku, potvrdu, obavijesti, backup/restore, biometriju,
   app switcher i vremensku zonu Zagreb.
2. **Privatna alpha:** riješiti pronađene greške i kontrolirano uskladiti
   Expo patch pakete. Izraditi samostalni preview APK s ugrađenim bundleom;
   dokazati offline rad bez Metroa. Razvojna i preview varijanta imaju
   različite pakete, pa se podatci prenose ručnim backupom i restoreom.
3. **Privatna beta:** najmanje dva tjedna stvarne uporabe. Bilježiti spor unos,
   duplikate, obavijesti, bateriju, padove i razumljivost statistike.
4. **Stabilan Android:** popravci iz bete, završni vizualni resursi,
   production konfiguracija i sigurno čuvanje signing ključa, potpisani
   APK/AAB, proba nadogradnje bez gubitka podataka i završni restore test.
5. **iOS, naknadno:** build i stvarni iPhone test tek nakon stabilnog Androida.
6. **Backend, uvjetno:** račun ili cloud samo ako beta pokaže potrebu.

Commit i push nisu napravljeni. Repozitorij je već na početku prikazivao
projektne datoteke kao nepraćene; nisu automatski dodavane u Git.

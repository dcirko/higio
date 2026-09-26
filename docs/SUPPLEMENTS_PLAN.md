# Suplementi — plan i provjera

Datum: 10. rujna 2026.

- [x] Pročitati sažetak, lokalne upute, dokumentaciju i postojeći model.
- [x] Dodati kategoriju i četiri predloška s jednim dnevnim terminom.
- [x] Verzionarati oznaku doze u rasporedu i spremati je uz izvršenje.
- [x] Uključiti dozu u uređivanje, Danas i povijest bez dodatnog dodira.
- [x] Dodati migraciju baze i backup format 2 s pretvorbom formata 1.
- [x] Provjeriti dnevni tok, poništavanje, naknadni unos i statistiku u SQLiteu.
- [x] Pokrenuti lint, TypeScript, testove, formatiranje i Expo provjere.
- [x] Pokrenuti Android prebuild i ARM64 debug build.
- [ ] Fizički Android: trajnost, offline rad, obavijesti, backup/restore,
      haptika, potvrda, biometrija i zaštita prikaza.

Jedan dodir označava cijelu konfiguriranu dnevnu dozu. Kreatin: 3 tablete;
magnezij, Omega-3 i multivitamin: 1 tableta. To su korisnikove zadane vrijednosti,
bez medicinskih preporuka. Promjena doze slijedi postojeće pravilo rasporeda:
od sutra; spremljeni zapisi čuvaju izvornu oznaku doze.

Android je obvezna platforma. iOS kompatibilnost ostaje, ali TestFlight ne
blokira lokalni Android MVP. Backend se razmatra tek ako lokalna beta pokaže
potrebu. Commit i push nisu dio ovog zadatka.

## Dokazi i granice

- Početno stanje: 12 Jest paketa / 47 testova prolazi.
- Završni Jest prolaz: 13 paketa / 53 testa, svi prolaze.
- TypeScript strict, ESLint bez upozorenja i Prettier cijelog mobilnog
  projekta prolaze.
- Novi SQLite test koristi Node SQLite engine i stvarne Drizzle repozitorije
  preko malog Expo adaptera. Provjerava četiri dnevna termina, zaštitu od
  dupliciranog dodira, undo, 7/30-dnevne brojke, promjenu doze od sutra,
  naknadni unos i očuvanje doze pri promjeni vremena zapisa.
- Export/restore test provjerava povrat starih i novih doza; namjerni SQL
  trigger izaziva grešku tijekom uvoza i potvrđuje rollback cijele zamjene.
- Strogi parser pretvara format 1 / schema 2 u format 2 / schema 3, bez
  izmišljanja doze starim zapisima; provjerava i nevaljane doze formata 2.
- Expo public config: SDK 57, Android paket com.domag.higio.dev, isključen
  automatski backup, postojeća iOS konfiguracija sačuvana.
- Android prebuild uspješno završen.
- Ponovljene završne provjere 11. rujna: 53/53 testa, TypeScript, ESLint i
  Prettier prolaze. Android/Hermes export: 2.034 modula, bundle oko 5,2 MB.
- ARM64 debug APK uspješno izgrađen 10. rujna 2026.: BUILD SUCCESSFUL,
  5 min 52 s. Izlaz: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk.
  Višearhitekturni pokušaj zaustavljen je radi opterećenja računala; završni
  build koristi arm64-v8a i dva Gradle radnika. Nije production build.
- Expo install --check prijavljuje dostupne novije SDK 57 patch verzije,
  uključujući Expo 57.0.21, RN 0.86.3 i expo-sharing 57.0.18. Ovisnosti nisu
  nadograđivane u ovoj funkcionalnoj promjeni; provjera kompatibilnosti zato
  nije označena zelenom.
- adb devices -l: pri provjeri nema priključenog uređaja. Fizički Android,
  sustavni picker/share, obavijesti, biometrija, haptika i ponašanje nakon
  ponovnog pokretanja mobitela nisu potvrđeni ovim desktop testovima.

Za ovaj checkout npm launcher traži nepostojeći korisnički npm. Naredbe je
moguće pokrenuti izravno kroz Node ili kroz postojeći npm-cli.js u
C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js.

## Sljedeća ručna Android provjera

1. Spojiti mobitel i potvrditi USB debugging; provjeriti adb devices -l.
2. Instalirati debug APK i pokrenuti Metro development server.
3. Više → Predlošci → Suplementi → Dodaj odabrano. Ponovni odabir ne smije
   duplicirati aktivnosti; postojeći nazivi ostaju zaštićeni istim pravilom
   deduplikacije kao i ostali predlošci.
4. Danas: provjeriti četiri kartice i doze, jednom dodirnuti Kreatin te
   provjeriti potvrdu, haptiku i Poništi.
5. Dodati propušteni zapis kroz Povijest; provjeriti dozu i 7/30-dnevne brojke.
6. Promijeniti dozu kreatina i provjeriti učinak od sljedećeg dana, uz očuvanje
   stare povijesne vrijednosti i naknadnog unosa za stari datum.
7. Izvesti backup, promijeniti podatke i vratiti ga uz potvrdu zamjene.
8. Ponovno otvoriti aplikaciju i ponovno pokrenuti mobitel; provjeriti
   trajnost, offline rad, Zagreb, lokalne obavijesti i background ponašanje.
9. Provjeriti biometrijsko zaključavanje i zaštitu nedavnih aplikacija.

Debug APK zahtijeva development server. Stabilan potpisani APK/AAB,
production offline provjera, nadogradnja bez gubitka podataka i barem dva
tjedna stvarne uporabe ostaju sljedeće faze nakon fizičke native provjere.

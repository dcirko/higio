# Fizička provjera i privatna alpha

Opseg: prve dvije faze nakon Suplemenata. Beta nije pokrenuta.

## Dostupnost fizičkog uređaja

Korisnik je 14. 9. potvrdio da fizički mobitel trenutačno nije dostupan.
Zato nisu potvrđeni haptika, biometrija,
stvarne obavijesti, sistemski picker/share, app switcher i trajnost nakon
ponovnog pokretanja mobitela. Faza fizičke provjere ostaje otvorena; emulator
je samo dodatni dokaz i ne zamjenjuje te provjere.

## Priprema alphe

- Expo SDK ostaje 57, podignut na 57.0.22; React Native na 0.86.3.
- Ostali Expo patch paketi usklađeni su kroz Expo CLI. Testni preset usklađen
  je s RN 0.86.3, a jest-expo s 57.0.5. Expo install --check prolazi.
- EAS preview eksplicitno proizvodi APK.
- Nakon završnih promjena ovisnosti prolaze TypeScript, ESLint bez upozorenja,
  Prettier cijelog mobilnog projekta. Nakon popravka tipkovnice prolaze
  54 Jest testa u 14 skupina (13. 9.); TypeScript, lint i formatiranje
  ponovno su prošli 14. 9.
- scripts/build-android-alpha.ps1 reproducira lokalni preview release build
  s ugrađenim JavaScriptom, ARM64 i x86_64 bibliotekama te dva Gradle radnika.
- APK i SHA-256 izlaze u apps/mobile/artifacts. Taj direktorij ne ulazi u Git.
- Raniji development APK sačuvan je kao artifacts/higio-previous-debug.apk.

Paket alphe je com.domag.higio.preview. Razvojni paket com.domag.higio.dev
ostaje odvojen. Lokalni alpha release potpisan je razvojnim ključem; služi
privatnom testiranju, ne javnoj objavi ili konačnoj production distribuciji.

## Trenutačni APK, provjeren 14. 9. 2026.

Prvi release build završio je za 20 min 22 s. Nakon popravka tipkovnice
ponovljeni build završio je 13. 9. za 3 min 2 s (36 izvršenih zadataka,
802 up-to-date). Trenutačni izlaz je apps/mobile/artifacts/higio-alpha.apk
(73 022 700 bajtova). Stari APK sačuvan je kao
artifacts/higio-alpha-before-keyboard-fix.apk.

SHA-256:

```text
FDF0913B16FE0DF9DAAA2C39E76ABE03C297720DB3D9237446B944AD31E26818
```

- aapt: com.domag.higio.preview, verzija 0.1.0, versionCode 1,
  minSdk 24, targetSdk 36, arhitekture arm64-v8a i x86_64.
- APK nije označen kao debuggable. Sadrži assets/index.android.bundle
  veličine 4 275 884 bajta.
- apksigner verify prolazi (v2), certifikat CN=Android Debug. To potvrđuje
  valjan razvojni potpis, ne production potpis.
- Certifikat SHA-256:
  fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.

Na postojećem emulatoru Higio_API_36 (Android API 36, x86_64) napravljena je
nova preview instalacija bez brisanja drugih aplikacija ili njihovih podataka.
Wi-Fi i mobilni podatci bili su isključeni (obje postavke 0), adb reverse
popis prazan. Potvrđeno je:

1. Otvaranje ugrađene aplikacije bez development servera i dovršavanje
   onboardinga s četiri predloška Suplemenata.
2. Prikaz kreatina s dozom 3 tablete i evidentiranje jednim dodirom:
   1 od 4 planiranih, 25%, potvrda spremanja i dostupna akcija Poništi.
3. Nakon am force-stop i ponovnog pokretanja isti unos ostaje sačuvan.
4. Povijest prikazuje Kreatin, 3 tablete, Tijekom dana i vrijeme unosa.
5. Statistika prikazuje 25%, 1 od 4 i isti posljednji unos, uz Europe/Zagreb.

Dokazi su očitani kroz UIAutomator XML, ne vizualnu inspekciju screenshotova.
Zapisnik ponovno pokrenutog Higio procesa nema podudaranja za FATAL EXCEPTION,
JavascriptException, ReactNativeJS Error ili nemogućnost učitavanja skripte.
Pri podizanju emulatora dogodili su se zastoj System UI-ja i pad emulatorova
Bluetooth procesa; nakon opcije Wait Higio test je prošao. To nije dokaz
stabilnosti fizičkog uređaja. Haptika, biometrija i stvarne obavijesti ostaju
na fizičkom checklistu. Dodatne emulator provjere opisane su niže.

Izvorne mrežne postavke (1/1) vraćene su i pokrenuti emulator ugašen.
Build log, UI XML datoteke, audit i procesni log spremljeni su lokalno u
apps/mobile/.expo/verification; taj scratch direktorij ne ulazi u Git.
Faza pripreme privatne alphe je dovršena. Fizička provjera ostaje otvorena
jer fizički uređaj nije povezan. Beta, commit i push nisu napravljeni.

Završna provjera 13. 9.: ponovno prolaze 53/53 testa u 13 skupina,
TypeScript, ESLint s max-warnings 0 i Prettier. Online ponavljanje Expo
install --check nije završilo zbog ECONNRESET; offline provjera kaže da su
ovisnosti usklađene, uz Expo upozorenje da je offline validacija manje
pouzdana. Prethodna online provjera 11. 9. prošla je nakon zadnje promjene
ovisnosti; nakon nje paketi nisu mijenjani.

## Dodatne provjere i završetak lokalne faze, 13.–14. 9.

Na instaliranom releaseu 13. 9. potvrđeni su Poništi (3/4 → 2/4), ispravak
vremena kreatina s 10:55 na 10:30 uz očuvanu dozu 3 tablete i promjena buduće
doze na 2 tablete od 14. 9. Postojeća baza sačuvana je pri nadogradnji APK-a.

Pronađen je problem zajedničkog AppSheet obrasca: tipkovnica je prekrivala
akcije, a Android Natrag zatvarao je obrazac. Dodani su KeyboardAvoidingView
i skrivanje tipkovnice prije zatvaranja. U novom APK-u potvrđeni su pomak
gumba iznad tipkovnice, Natrag bez gubitka izmjene i uspješno spremanje.
Regresijski test podigao je ukupan broj na 54 testa u 14 skupina; svi prolaze.

Prekinuti restore test dovršen je 14. 9.:

1. Aplikacija je 13. 9. generirala stvarni Android JSON export (format 2,
   schema 3). Otvoren je sistemski share dijalog. Emulator nudi Quick Share,
   Drive i Gmail, bez lokalnog cilja za spremanje. Ništa nije poslano.
2. Samo generirana sintetička kopija preuzeta je iz cachea testnog emulatora
   preko adb root i prenesena u njegov Downloads. Time nije potvrđen puni
   korisnički tok spremanja preko share cilja; on ostaje za fizički uređaj.
3. Nakon izvoza kroz aplikaciju je potvrđeno uklanjanje testnog magnezija.
   Android DocumentPicker učitao je kopiju i prikazao sažetak prije zamjene.
4. 14. 9. potvrđena je zamjena testne baze. Povijest ponovno prikazuje
   magnezij (1 tableta, 18:31) i kreatin (3 tablete, 10:30) za 13. 9.
   Poništeni Omega-3 nije prikazan kao aktivno izvršenje. Kopija ima tri
   retka povijesti, od kojih je jedan označen obrisanim; dva su aktivna.
5. Danas za 14. 9. prikazuje novu dozu kreatina 2 tablete, a statistika
   2 od 8 planiranih termina (25%). Nakon force-stop i ponovnog pokretanja
   podaci ostaju sačuvani, uključujući posljednji unos vraćenog magnezija.
6. Wi-Fi i mobilni podatci bili su 0/0; adb reverse popis prazan. Zapisnik
   ponovno pokrenutog procesa nema pronađene fatalne/JavaScript greške.

Dokazi su alpha-sept14-*.xml i alpha-sept14-runtime.txt u lokalnom
apps/mobile/.expo/verification. Početne mrežne postavke ovog nastavka bile
su 0/0 i ostale su iste. Potvrđeno je da adb nije root; emulator je ugašen.

Lokalna faza je dovršena uz navedeno ograničenje share spremanja. Fizička
faza nije izvršena jer je korisnik 14. 9. potvrdio da mobitel nije dostupan.
Za nju je pripremljen [ANDROID_DEVICE_CHECKLIST.md](ANDROID_DEVICE_CHECKLIST.md).
Slijede fizička provjera, najmanje dva tjedna privatne uporabe i stabilizacije,
pa konačna regresija, verzija, trajni release potpis i dogovorena distribucija.
Backend i iOS nisu uvjet za dovršetak prve Android verzije.

## Sigurnosne ovisnosti

Nakon usklađivanja bilo je 25 npm nalaza (19 moderate, 6 high). Kompatibilni
npm audit fix, bez force opcije, smanjio ih je na 23 (19 moderate, 4 high,
0 critical). Preostali high nalazi potječu iz image-size i njegova Metro
lanca izgradnje. Nisu označeni popravljenima.

Ponovljeni audit 13. 9. 2026. potvrđuje isti broj i ozbiljnost nalaza.

GitHub advisories trenutačno navode da nema objavljene ispravljene verzije za
[ICNS parser](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) i
[JXL/HEIF parsere](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).
Build koristi postojeće projektne resurse. Nemoj uključivati neprovjerene
slikovne resurse u build dok ta stavka nije riješena. Nisu korišteni
nekompatibilni Expo/Drizzle downgradeovi koje predlaže force audit.

## Instalacija i prijenos podataka

1. U postojećem Higio Dev izvozi backup kroz Više → Podatci i privatnost.
2. Instaliraj apps/mobile/artifacts/higio-alpha.apk na kompatibilni uređaj.
   Preko USB-a: adb -s SERIAL install -r apps/mobile/artifacts/higio-alpha.apk
   iz korijena repozitorija; SERIAL zamijeni stvarnim identifikatorom uređaja.
3. Otvori Higio Preview i po potrebi uvezi spremljeni backup uz potvrdu.
4. Ugasi Wi-Fi i mobilne podatke, zatvori pa ponovno otvori aplikaciju i
   provjeri evidentiranje, povijest i trajnost. Metro nije potreban.
5. Provjeri sve otvorene stavke iz ANDROID_ALPHA_PLAN.md na fizičkom mobitelu.

Ne deinstalirati postojeću aplikaciju radi prijenosa podataka. Različiti
paketi imaju zasebnu SQLite bazu. Za ažuriranje iste preview aplikacije
koristiti isti potpis i install -r, uz prethodni ručni backup.

## Ponovni lokalni build

Iz apps/mobile, uz JAVA_HOME za JDK 21 i ANDROID_HOME za postojeći SDK:

```powershell
./scripts/build-android-alpha.ps1
```

Samo ARM64:

```powershell
./scripts/build-android-alpha.ps1 -Architectures arm64-v8a
```

Nastavak prekinutog builda kada se native konfiguracija i ovisnosti nisu
mijenjale (zadržava native projekt i cache):

```powershell
./scripts/build-android-alpha.ps1 -Resume
```

Resume provjerava da postojeći native projekt koristi preview paket.

Script regenerira lokalni Android projekt za preview varijantu. Za povratak
na razvojnu varijantu treba pokrenuti prebuild uz APP_VARIANT=development.
Izvorni cross-platform kod i iOS konfiguracija ostaju sačuvani.

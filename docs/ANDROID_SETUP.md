# Android razvojno okruženje

Datum provjere: 26. srpnja 2026.

## Instalirano

- JDK 21: `C:\Program Files\Java\jdk-21`
- Android SDK: `C:\Users\domag\AppData\Local\Android\Sdk`
- Android SDK Platform 36
- Android Build Tools 36.0.0 i kompatibilni 35.0.0
- Android Platform Tools 37.0.0
- Android Emulator 36.6.11
- Android NDK 27.1.12297006 i CMake 3.22.1 za React Native native module
- Google APIs x86_64 system image za Android 16 / API 36
- Pixel 7 AVD: `Higio_API_36`

Android Studio IDE nije potreban za svakodnevni rad na Higiju. Instalirani su
službeni command-line alati, SDK i emulator, čime se izbjegava velika dodatna
instalacija. Android Studio može se naknadno dodati ako bude potreban grafički
Device Manager ili native debugging.

## Korisničke varijable

- `ANDROID_HOME=C:\Users\domag\AppData\Local\Android\Sdk`
- `JAVA_HOME=C:\Program Files\Java\jdk-21`

U korisnički `PATH` dodani su:

- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\emulator`
- `%ANDROID_HOME%\cmdline-tools\latest\bin`

Novi terminal potrebno je otvoriti nakon promjene varijabli.

## Pokretanje emulatora i aplikacije

U prvom PowerShell prozoru:

```powershell
emulator -avd Higio_API_36
```

Provjera uređaja:

```powershell
adb devices -l
adb -s emulator-5554 shell getprop sys.boot_completed
```

Kada je rezultat `1`, u repozitoriju pokreni:

```powershell
cd C:\Users\domag\source\repos\Higio\apps\mobile
npm run android
```

Prvi build traje dulje jer Gradle preuzima i kompajlira native ovisnosti.
Sljedeći buildovi koriste lokalni cache.

Za ponovno pokretanje JavaScript dijela već instaliranog development clienta:

```powershell
npm start
```

## Granica native provjere

Emulator je dovoljan za provjeru:

- stvarnog Android development builda
- SQLite migracija i trajnosti podataka nakon ponovnog pokretanja
- native `Modal` prikaza
- `expo-haptics` poziva i njegova zapisa u Android `vibrator_manager` povijesti

Na API 36 emulatoru Higio potvrda zabilježena je kao `CLICK` efekt s `TOUCH`
namjenom i paketom `com.domag.higio.dev`. Emulator ne može potvrditi subjektivni
taktilni osjećaj vibracije. To ostaje kratka završna provjera na fizičkom
Android uređaju.

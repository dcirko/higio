# Izvještaj Faze 4 — prva interna alpha

Datum: 26. srpnja 2026.

## Isporučeno

- pregled aktivnih, pauziranih i arhiviranih aktivnosti
- kreiranje i uređivanje aktivnosti
- naziv i neobvezna kratka napomena
- osam kategorija, izbor ikone i paleta boja
- jednostavni raspored svaki dan
- jednostavni raspored odabranim danima u tjednu
- jedan ili više slotova: jutro, dan, večer i bilo kada
- pauziranje, ponovno aktiviranje i arhiviranje bez brisanja povijesti
- završeni današnji termin ostaje vidljiv i nakon pauziranja
- nova Drizzle migracija za opis, status i verzioniranu povijest stanja
- React Hook Form i Zod validacija forme
- osvježen ekran Danas s bojom aktivnosti, brzim dodavanjem, upravljanjem i
  korisnim praznim stanjem
- postojeći one-tap tok, optimistički UI, full-screen potvrda, haptika i
  `Poništi` ostaju glavni put korištenja

## Važne odluke

### Promjena rasporeda

Izgled i tekst aktivnosti mijenjaju se odmah. Promjena rasporeda stvara novu
verziju koja vrijedi od sutra. Današnji plan zato se ne mijenja usred dana, a
stara statistika zadržava izvorno značenje.

Ako korisnik isti dan ponovno uređuje već spremljenu buduću verziju, Higio
uređuje tu verziju umjesto stvaranja preklapajućih rasporeda.

### Pauziranje i arhiviranje

Aktivnost dobiva trenutačni status radi brzog prikaza, a svaka promjena statusa
zapisuje se i u `activity_state_versions`. Logovi i rasporedi se ne brišu.
Time buduća statistika može točno izostaviti pauzirana razdoblja.

### Opseg editora

Prva alpha u editoru namjerno izlaže samo dnevni i tjedni raspored. Domenski
engine već podržava intervalne i neplanirane aktivnosti, ali njihov puni UX
pripada Fazi 5.

## Native razvojno okruženje

- Android 16 / API 36 Pixel 7 AVD `Higio_API_36`
- compile i target SDK 36
- JDK 21
- Android Gradle build s Expo development clientom
- SQLite i Drizzle koriste stvarnu Android pohranu, ne web adapter

Detalji ponovnog pokretanja nalaze se u `ANDROID_SETUP.md`.

## Automatska provjera

- `npm run lint`: prolazi bez grešaka
- `npm run typecheck`: prolazi
- `npm test`: 5 suiteova i 16 testova prolazi
- `npx expo-doctor`: 20/20 provjera prolazi
- Expo konfiguracija: SDK 57, React Native 0.86, package
  `com.domag.higio.dev`

Testovi dodatno potvrđuju:

- kreiranje i uređivanje aktivnosti
- pojavljivanje nove aktivnosti u današnjem planu
- skrivanje nedovršene pauzirane/arhivirane aktivnosti
- zadržavanje već dovršene kartice nakon pauziranja
- postojeća pravila rasporeda, Europe/Zagreb vrijeme, one-tap i undo

## Native smoke provjera

Na Android API 36 emulatoru provjereni su:

- instaliranje i pokretanje development builda
- izvršavanje obje SQLite migracije i stvaranje početnih podataka
- prikaz ekrana Danas i upravljanja aktivnostima
- full-screen native modal nakon evidentiranja
- `expo-haptics` poziv koji je Androidov `vibrator_manager` evidentirao kao
  Higio `CLICK` efekt s `TOUCH` namjenom
- zadržavanje SQLite evidentiranja nakon force-stop i ponovnog pokretanja
- kreiranje aktivnosti s odabranom kategorijom i ikonom
- otvaranje editora, pauziranje i arhiviranje uz zaštitne potvrde
- premještanje probne aktivnosti iz aktivne u pauziranu pa arhiviranu skupinu
- izostanak fatalnih React Native i SQLite grešaka u završnom logcat pregledu

Emulator nema stvarni taktilni osjećaj telefona. Subjektivna jačina haptike
ostaje jedina kratka provjera za fizički Android uređaj.

## Sljedeća faza

Faza 5 dovršava puni scheduling UX:

1. interval svakih N dana ili tjedana
2. aktivnost bez rasporeda
3. datum početka rasporeda
4. sljedeći očekivani termin
5. overdue i naknadno evidentiranje
6. šira automatska matrica promjena rasporeda

Backend, registracija, cloud sinkronizacija i obavijesti i dalje su izvan
trenutačnog opsega.

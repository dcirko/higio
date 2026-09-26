# Završetak prve Android verzije

Aktivni zahtjev: završiti aplikaciju. Korisnik je potvrdio da je mobitel
dostupan; USB veza još nije potvrđena. Ne brisati postojeće podatke,
ne objavljivati aplikaciju i ne raditi commit/push bez zahtjeva.

## 1. Provjera postojećeg izdanja

- [x] Alpha APK, restore, verzije doze i tipkovnica provjereni na emulatoru.
- [x] 54 testa prolaze; TypeScript, lint i formatiranje provjereni.
- [ ] Osvježiti audit ovisnosti i zapisati preostale nalaze.
- [ ] Pregledati praktični lokalni backup tok i završne upute.

## 2. Fizički uređaj

- [ ] Autoriziran USB uređaj i provjera postojeće instalacije/podataka.
- [ ] Instalacija ili nadogradnja bez brisanja baze.
- [ ] Izvršiti ANDROID_DEVICE_CHECKLIST.md; zabilježiti model i rezultate.
- [ ] Popraviti pronađene probleme i ponovno provjeriti zahvaćene tokove.

## 3. Izdanje i predaja

- [ ] Potvrditi privatni APK ili Google Play kao cilj distribucije.
- [ ] Pripremiti trajan siguran način potpisivanja i nadogradnji.
- [ ] Izraditi, pregledati i testirati instalacijski paket.
- [ ] Dovršiti korisničke upute, bilješke izdanja i popis otvorenih provjera.

Stabilnost kroz najmanje dva tjedna stvarne uporabe ostaje vremenska provjera;
ne smije se označiti dovršenom na temelju kratkog testa. Backend, cloud i iOS
nisu uvjet za prvu Android verziju.

# Provjera alphe na fizičkom Androidu

Status 14. 9. 2026.: mobitel nije dostupan; nijedna stavka u nastavku nije
označena provjerenom. Emulator rezultati opisani su u ANDROID_ALPHA_REPORT.md.

## Priprema i instalacija

- [ ] Zabilježiti model, Android verziju i datum provjere.
- [ ] Spojiti uređaj USB-om, uključiti USB debugging i prihvatiti računalo.
- [ ] Provjeriti da adb prikazuje baš taj uređaj kao device.
- [ ] Ako već postoji Higio, prvo izvesti kopiju i provjeriti gdje je spremljena.
- [ ] Instalirati apps/mobile/artifacts/higio-alpha.apk; ne brisati postojeće podatke.

Iz korijena projekta, uz stvarni serijski broj umjesto SERIAL:

```powershell
& "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices -l
& "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s SERIAL install -r apps/mobile/artifacts/higio-alpha.apk
```

Preview paket je com.domag.higio.preview. Dev paket ima zasebnu bazu;
prijenos je ručni export/restore. Ako potpis postojeće preview instalacije
nije kompatibilan, zaustaviti nadogradnju i sačuvati podatke; ne deinstalirati
aplikaciju kao prečac. Ovaj APK ima razvojni potpis za privatno testiranje.

## Evidentiranje i uređivanje

- [ ] Prvi ulazak radi bez mreže i bez Metroa.
- [ ] Jedan dodir sprema jedan zapis, uz vidljivu potvrdu i haptiku.
- [ ] Brzi ponovljeni dodiri ne dupliciraju planirani termin.
- [ ] Poništi vraća broj izvršenja i povijest na prethodno stanje.
- [ ] Urediti vrijeme testnog zapisa s otvorenom tipkovnicom: spremanje je dostupno.
- [ ] Natrag skriva tipkovnicu bez odbacivanja unesene izmjene.
- [ ] Ručni unos propuštenog termina ispravno ažurira Danas i statistiku.
- [ ] Promjena doze vrijedi od sutra; stara povijest zadržava staru dozu.
- [ ] Nakon zatvaranja aplikacije i restarta mobitela zapisi ostaju sačuvani.

## Podsjetnici i zaštita

- [ ] Uključiti podsjetnik kroz aplikaciju i provjeriti traženje dozvole.
- [ ] Obavijest stiže u odabrano vrijeme u pozadini; otvara odgovarajući prikaz.
- [ ] Odbijena dozvola ne ruši aplikaciju; naknadno uključivanje radi.
- [ ] Uključiti zaključavanje i provjeriti uspjeh, odustajanje i povratak iz pozadine.
- [ ] Privatni prikaz skriven je u nedavnim aplikacijama; snimanje zaslona je blokirano.
- [ ] Datum i vrijeme odgovaraju Europe/Zagreb, uključujući promjenu dana.

## Kopija i povrat

Ovaj dio provoditi na sintetičkim zapisima ili nakon provjerenog backupa
postojećih podataka. Potvrđeni restore zamjenjuje trenutačnu lokalnu bazu.

- [ ] Izvesti kopiju, spremiti je preko dostupnog sistemskog cilja i pronaći datoteku.
- [ ] Odabrati je kroz sistemski picker; provjeriti naziv, datum i sažetak.
- [ ] Odustati od povrata i potvrditi da baza ostaje nepromijenjena.
- [ ] Na testnim podatcima ukloniti jedan zapis pa potvrditi povrat kopije.
- [ ] Provjeriti vraćeni zapis, doze, rasporede, statistiku i ponovno otvaranje.
- [ ] Nevaljana kopija prikazuje razumljivu grešku i ne mijenja podatke.
- [ ] Vratiti mrežne i testne postavke na početne vrijednosti.

## Nakon fizičke provjere

Voditi najmanje dva tjedna privatne uporabe. Bilježiti datum, očekivano i
stvarno ponašanje te način ponavljanja problema. Tek nakon rješavanja
problema s podatcima, podsjetnicima i ključnim tokovima pripremiti stabilno
izdanje: konačnu regresiju, verziju, trajni potpis i način distribucije.
Backend i iOS nisu uvjet za prvu završenu Android verziju.

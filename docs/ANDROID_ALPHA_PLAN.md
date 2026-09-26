# Fizički Android i privatna alpha

Opseg ovog nastavka: samo prve dvije faze nakon Suplemenata. Beta, stabilna
production verzija, iOS i backend nisu dio ovog rada.

## 1. Fizička Android provjera

- [ ] Povezan i autoriziran fizički uređaj.
- [ ] Instalacija i prvi ulazak.
- [ ] Suplementi, one-tap, potvrda, haptika i Poništi.
- [ ] Naknadni unos, povijest, statistika i očuvanje stare doze.
- [ ] Trajnost nakon zatvaranja aplikacije i ponovnog pokretanja mobitela.
- [ ] Obavijesti, biometrija i zaštita nedavnih aplikacija.
- [ ] Izvoz i uvoz kroz stvarni sistemski picker/share.
- [ ] Offline rad i Europe/Zagreb.

Početna adb provjera nije pronašla uređaj. Desktop testovi ili emulator ne
zatvaraju ovu fazu. Postojeće podatke ne brisati; prije zamjene ili prijenosa
napraviti ručni backup kroz aplikaciju.

## 2. Privatna alpha

- [x] Uskladiti Expo SDK 57 patch pakete i lock datoteku.
- [x] TypeScript, lint, 53 testa, formatiranje i Expo compatibility check.
- [x] Pripremiti ponovljiv lokalni preview release build s ugrađenim bundleom.
- [x] Izgraditi i pregledati alpha APK: identitet, arhitekture, bundle, potpis.
- [x] Provjeriti pokretanje i rad bez Metroa; navesti vrstu uređaja.
- [x] Dokumentirati instalaciju, prijenos podataka i preostale fizičke provjere.

13. 9. 2026.: release APK izgrađen i pregledan. Na emulatoru Higio_API_36
(Android API 36, x86_64) bez Wi-Fija, mobilnih podataka i adb reverse veze
prošli su onboarding Suplemenata, jedan unos kreatina, ponovno otvaranje
nakon force-stop, povijest s dozom i statistika. Fizička faza ostaje otvorena.

Lokalna alpha koristi razvojni ključ samo za privatno testiranje. To nije
production potpis niti javna distribucija. Razvojni i preview paket imaju
odvojene podatke; prijenos je ručni export/restore. Ne pokretati betu niti
raditi commit/push u ovom nastavku.

## 3. Dodatna lokalna provjera po nastavku 13. 9.

- [x] Ponovno podizanje emulatora i trajnost prethodnog unosa.
- [x] Popraviti i ponovno provjeriti obrazac s otvorenom Android tipkovnicom.
- [x] Poništi i ispravak povijesti na instaliranom releaseu.
- [x] Promjena doze bez prepisivanja stare povijesti.
- [x] Native izvoz, odabir datoteke i potvrđeni restore testne kopije.
- [x] Dopuniti izvještaj rezultatima i preostalim ograničenjima.

Restore potvrđen 14. 9.: uklonjeni magnezij vraćen, stara doza kreatina
sačuvana, nova doza aktivna 14. 9.; statistika 2/8 i trajnost nakon restarta
prolaze offline. Prijenos export datoteke iz cachea u Downloads emulatora
napravljen je ADB-om jer nema lokalnog share cilja. Stvarni korisnički tok
spremanja na mobitelu i dalje je otvoren.

Ovo proširuje emulator provjeru postojeće alphe na korisnikov zahtjev za
nastavkom. Ne zamjenjuje fizički checklist niti započinje javnu distribuciju.

## 4. Nastavak 14. 9. — sljedeće dvije faze

1. Dovršeno: lokalni restore test, završne provjere, APK hash i izvještaj.
2. Fizička provjera: korisnik je potvrdio da mobitel trenutačno nije dostupan.
   Izvršenje ostaje otvoreno; pripremljen je ANDROID_DEVICE_CHECKLIST.md.

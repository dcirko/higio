# Faza 7 — lokalni podsjetnici

Datum završetka: 1. kolovoza 2026.

## Ishod

Higio sada ima potpuno opcionalne lokalne podsjetnike koji rade bez računa,
interneta i backenda. Korisnik dozvolu vidi tek kada prvi put uključi
podsjetnike, a odbijanje dozvole ni na koji način ne blokira ostatak aplikacije.

Podsjetnici se grupiraju po dijelu dana kako korisnik ne bi dobio zasebnu
obavijest za svaku aktivnost. Zadana vremena su 08:00 za jutro i 20:30 za
večer. Grupa tijekom dana postoji, ali je zadano isključena.

## Isporučeno

- ekran `Više → Podsjetnici` s glavnim prekidačem i statusom sistemske dozvole
- zasebno uključivanje i vrijeme za jutro, tijekom dana i večer
- dozvola se traži samo nakon izričite korisnikove akcije
- jedna grupirana obavijest za sve nedovršene aktivnosti istog dijela dana
- 14-dnevni pomični horizont lokalno zakazanih obavijesti
- privatni tekst bez naziva aktivnosti kao zadana opcija
- opcionalno prikazivanje naziva aktivnosti u tekstu obavijesti
- Android kanal privatne vidljivosti na zaključanom zaslonu
- dodir obavijesti otvara ekran Danas
- automatsko ponovno planiranje nakon izvršenja, undo akcije, promjene
  aktivnosti, povratka u aplikaciju i promjene postavki podsjetnika
- uklanjanje zastarjelih i dvostrukih sistemskih obavijesti
- uklanjanje Higio podsjetnika nakon isključivanja ili oduzimanja dozvole
- postavke i evidencija zakazanih ID-jeva spremaju se lokalno u postojeću
  SQLite tablicu `settings`
- web preview ostaje upotrebljiv, ali jasno označava da su native obavijesti
  dostupne samo u Android/iOS aplikaciji

## Produktna pravila

Podsjetnik se planira samo ako je termin planiran, još nije evidentiran i
njegovo vrijeme obavijesti je u budućnosti. Aktivnosti bez rasporeda ne stvaraju
obavijest. Termin koji je već obavljen uklanja se iz sljedećeg usklađivanja.

Higio koristi fiksnu kućnu zonu `Europe/Zagreb`, jednako kao ekran Danas i
povijest. Stvarni trenutak obavijesti sprema se kao UTC. Tijekom proljetnog DST
skoka nepostojeća minuta pomiče se na prvu stvarnu minutu, dok se kod ponovljenog
jesenskog sata deterministički koristi prvo pojavljivanje.

Tekst je namjerno nenametljiv. Zadano se prikazuje samo poruka poput
`Vrijeme je za jutarnju rutinu`, bez privatnih naziva aktivnosti.

## Arhitektura

Čisti domenski planer iz današnjih termina stvara željeni skup podsjetnika.
`ReminderCoordinator` uspoređuje taj skup sa stvarno zakazanim obavijestima u
operacijskom sustavu. Zadržava samo zapise s istim stabilnim ključem i
fingerprintom, otkazuje zastarjele te zakazuje ono što nedostaje.

Expo Notifications je zatvoren iza malog `NotificationGateway` sučelja. Zbog
toga su planiranje, uklanjanje duplikata i ponašanje kod oduzete dozvole
testirani bez Android/iOS runtimea.

Native provjera otkrila je i uklonila performansni problem u pretvorbi vremena.
Formatteri za Zagreb sada se ponovno koriste, a mogući UTC offseti dobivaju se
iz stvarnih offseta oko zadanog dana umjesto skeniranja svih svjetskih offseta.
DST ponašanje ostalo je pokriveno testovima, a JS thread više ne blokira tijekom
planiranja 14-dnevnog horizonta.

## Provjera

- TypeScript strict: prolazi
- Jest: 8 paketa, 33 testa, sve prolazi
- testovi planera: grupiranje, privatni tekst, dovršeni i neplanirani termini,
  prikaz naziva te proljetni DST skok
- testovi koordinatora: bez duplikata, promjena vremena, završetak termina i
  oduzeta dozvola
- Android API 36 emulator `Higio_API_36`: aplikacija se gradi i pokreće
- Android sistemski dijalog za dozvolu: stvarno prikazan tek nakon uključivanja
- dozvola: stvarno odobrena na emulatoru
- lokalni Android kanal `higio-reminders-v2`: stvarno kreiran bez upozorenja o
  nepostojećem zvuku
- Expo/Android scheduler: stvarno je zakazao 27 budućih lokalnih obavijesti;
  alarmi su vidljivi u Android `AlarmManageru`
- nakon optimizacije vremena aplikacija se ponovno pokreće i ekran Danas te
  postavke podsjetnika ostaju responzivni

Stvarni taktilni osjećaj, ponašanje zaključanog zaslona i iOS prikaz još treba
potvrditi na fizičkim uređajima prije privatne bete.

## Sljedeće

Faza 8 izrađuje objašnjivu statistiku iz postojećih planiranih termina i
`activity_logs` zapisa: tjedni i mjesečni rezultat, trend 7/30 dana, posljednje
izvršenje i prosječni razmak za intervalne i neplanirane aktivnosti.

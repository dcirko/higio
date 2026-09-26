# Nadogradnje nakon svakodnevnog korištenja

## 1. Podsjetnici i čitljivost — implementirano

- Dnevni podsjetnik „Neodrađeno danas”, zadano u 21:00, s promjenjivim vremenom i prekidačem.
- Obuhvaća sve neodrađene planirane termine dana, uključujući jutarnje. Ne uključuje brze, neplanirane unose.
- Postojeća globalna postavka obavijesti i privatnost ostaju sačuvane. Nazivi aktivnosti prikazuju se samo uz postojeći izričiti odabir.
- Evidentiranje otkazuje nepotrebne podsjetnike; poništavanje ponovno planira budući podsjetnik.
- Ispraviti tekst na primarnim gumbima, oznakama odabira i porukama nakon spremanja u obje teme; provjeriti kontrast.
- Provjere: testovi planiranja i otkazivanja, tipovi, lint i Android paket.

## 2. Povremena njega i zubni konac — implementirano

- Šišanje kose, brijanje brade, intimno brijanje i rezanje noktiju: prikaz „Zadnji put” s datumom i vremenom, bez dnevnog cilja ili kašnjenja.
- Zadržati jednostavno evidentiranje i povijest.
- Ukloniti zubni konac iz aktivnog prikaza i predložaka; postojeću povijest sačuvati.

## 3. Widget početnog zaslona — odgođeno na zahtjev korisnika

- Android widget s današnjim preostalim aktivnostima i otvaranjem aplikacije.
- Razraditi brzo evidentiranje, osvježavanje i privatnost prije implementacije.

20. 9. 2026.: korisnik je odgodio widgete. Nedovršena implementacija, registracija nativnog modula i stavka izbornika su uklonjeni. Widget nije uključen u ovu nadogradnju.

## 4. Pas — implementirano, APK izrađen

- Zadnje kupanje i zadnja tableta protiv buha.
- Šetnje i hrana triput dnevno, uz zasebne termine i povijest.
- Odvojena sekcija od osobne njege.

Faze 1, 2 i 4 su implementirane. Faza 3 je odgođena na zahtjev korisnika. Faza 2 jednokratno prilagođava rasporede i arhivira zubni konac; ne briše izvršenja ni stare verzije rasporeda.

### Provjere faze 1 (16. 9. 2026.)

- 61 test u 15 skupina prolazi; dodatno ponovljeni testovi koordinatora i kontrasta nakon završnih izmjena.
- TypeScript, ESLint i Prettier prolaze.
- Android release build uspješan. APK: `apps/mobile/artifacts/higio-alpha.apk`, paket `com.domag.higio.preview`, ARM64 i x86_64, valjan postojeći razvojni potpis za privatno korištenje.
- SHA-256 APK-a: `20562CC7932A3A31B9990C83DEB3839DB925A289618AC4A74D13380C43610B39`.
- Testovi pokrivaju propušteno jutro, termine „bilo kada”, isključivanje, prošlo vrijeme, završene/neplanirane aktivnosti, stare postavke, otkazivanje i poništavanje.
- Kontrast testiran numerički na najmanje 4,5:1 za glavne tekstove, sekundarne tekstove, gumbe, poruke i statusne boje u obje teme. Provjereno i da gumb i poruka primjenjuju odgovarajuće boje.
- Popravljen tekst gumba u Povijesti, odabranih dana i predložaka te oznaka dovršavanja. Onemogućeni gumbi više ne smanjuju čitljivost cijelog sadržaja prozirnošću.
- Dostava obavijesti i izgled na fizičkom mobitelu još zahtijevaju provjeru ove nadogradnje.

### Korištenje

Više → Podsjetnici → Lokalni podsjetnici. Dopustiti obavijesti ako sustav zatraži. „Neodrađeno danas” zadano je uključeno u 21:00 unutar globalne postavke podsjetnika; vrijeme i pojedini podsjetnik mogu se promijeniti. Ako su lokalni podsjetnici prethodno bili isključeni, ostaju isključeni.

Otvoriti aplikaciju nakon nadogradnje da se raspored osvježi. Raspored je lokalni i obnavlja se pri otvaranju aplikacije i promjeni evidencije; postojeći horizont iznosi 14 dana. Vrijeme slijedi Europe/Zagreb. Dostavu u pozadini može odgoditi sustav uređaja.

APK instalirati kao nadogradnju postojeće Higio preview aplikacije, bez deinstalacije. Prethodni APK sačuvan je kao `apps/mobile/artifacts/higio-alpha-before-phase1.apk`.

### Faza 2 — ponašanje nadogradnje (17. 9. 2026.)

- Na prvom otvaranju postojeće Android/iOS instalacije prepoznati nazivi šišanja, brijanja i noktiju dobivaju raspored bez termina. Rasporedi za datume prije nadogradnje ostaju sačuvani. Pauzirane/arhivirane aktivnosti ostaju takve.
- „Brijanje” se preimenuje u „Brijanje brade”, a „Odlazak frizeru” u „Šišanje kose”. Prepoznaju se i nazivi bez dijakritike, razlike u velikim slovima i višak razmaka. Proizvoljno drukčije nazvane aktivnosti ne mijenjaju se automatski.
- Nedostajuće od četiri aktivnosti dodaju se u postojeću instalaciju. Za novu instalaciju postoji paket predložaka „Povremena njega”. Pranje kose zadržava svoj raspored.
- Na kartici piše puni datum i vrijeme: „Zadnji put: 16.09.2026. u 20:30”, odnosno „Zadnji put: još nije evidentirano”. Jedan dodir evidentira novi unos, a Poništi vraća prethodni prikaz.
- Zubni konac uklonjen je iz predložaka i arhiviran u postojećim podacima; izvršenja ostaju u Povijesti. Čak ni izvršenje od dana nadogradnje ne ostavlja njegovu karticu u današnjem prikazu.
- Nadogradnja se izvršava u transakciji samo jednom; oznaka izvršenja ulazi u backup. Uvoz starije kopije također pokreće prilagodbu. Format backupa i shema baze ostaju isti.
- SQLite testovi pokrivaju očuvanje logova, arhiviranje, stare i buduće rasporede, pauzirane aktivnosti, idempotentnost, rollback, uvoz stare kopije, novi unos i poništavanje te izostanak dnevnih ciljeva/podsjetnika.
- Završne provjere: 67 testova u 16 skupina prolazi; TypeScript, ESLint i Prettier prolaze.
- Android build dovršen 19. 9. 2026. (`artifacts/phase2-build.log`): BUILD SUCCESSFUL. Novi `artifacts/higio-alpha.apk` ima 73.028.496 bajtova, ARM64/x86_64, paket `com.domag.higio.preview` i isti valjani razvojni certifikat kao prethodni APK.
- SHA-256 APK-a faze 2: `1104A726C122C70CEF973E8297DE1409656F594D3054E3A3262D2BF340F01F35`.
- Web preview ima nove predloške i prikaz datuma; jednokratna nadogradnja postojećih podataka odnosi se na nativnu SQLite aplikaciju.
- APK prije ove faze sačuvan je kao `apps/mobile/artifacts/higio-alpha-before-phase2.apk`. Fizički mobitel nije provjeren ovom nadogradnjom.

Provjera na mobitelu nakon instalacije: otvoriti Danas, pronaći četiri kartice povremene njege, usporediti stari datum s Poviješću, evidentirati jedan unos pa pritisnuti Poništi i provjeriti vraćanje datuma. Zubni konac treba biti odsutan s Danas, a njegova stara izvršenja prisutna u Povijesti. Dnevni postotak ne smije se promijeniti dodirivanjem povremene njege.

### Sekcija za psa (20. 9. 2026.)

- Više → Pas → Dodaj osnovnu rutinu za psa. Dodavanje se pokreće korisnikovim dodirom; ponavljanje ne duplicira postojeće osnovne aktivnosti istog naziva i kategorije.
- Hrana i šetnja imaju po tri dnevna termina: jutro, dan, večer. Šest termina čini zaseban napredak psa.
- Kupanje i tableta protiv buha su bez rasporeda: datum/vrijeme zadnjeg evidentiranja ili prikaz da još nema unosa. Nema automatskog intervala za tabletu.
- Jedan dodir evidentira termin; Poništi vraća stanje. Povijest uključuje kategoriju Pas, a rasporedi se mogu urediti kroz Aktivnosti.
- Osobni prikaz Danas i osobna statistika izuzimaju kategoriju Pas. Postojeći podsjetnici obuhvaćaju sve aktivne planirane termine, uključujući hranu i šetnje, prema korisnikovim postavkama.
- Kategorija `pet-care` prihvaćena je u uređivanju i backupu. Nema nove tablice ni brisanja postojećih zapisa. Kopija s ovom kategorijom zahtijeva ovu ili noviju verziju za uvoz.
- 69 testova u 16 skupina prolazi; TypeScript, ESLint i Prettier prolaze. Testovi uključuju nativne SQLite repozitorije, backup/restore i UI evidentiranje/poništavanje.
- Android build dovršen 21. 9. 2026.: BUILD SUCCESSFUL (3 min 1 s), log `apps/mobile/artifacts/dog-build.log`. `higio-alpha.apk` sada sadrži sekciju za psa; widget nije registriran u manifestu.
- APK: 73.033.940 bajtova, ARM64/x86_64, paket `com.domag.higio.preview`, isti valjan razvojni potpis kao prethodni APK. SHA-256: `379F8D21E05E6430C2EB673580FF65395B903E695D1CDDE5A1C541AD5B18F858`.
- Prethodni APK sačuvan kao `higio-alpha-before-dog.apk`. Instalirati kao nadogradnju bez deinstalacije. Fizička provjera sekcije za psa na mobitelu nije obavljena.

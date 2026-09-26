# Higio — specifikacija proizvoda

## Aktualna odluka — 10. rujna 2026.

Android je primarna i obvezna platforma: završetak lokalnog MVP-a zahtijeva
provjeru na fizičkom Android mobitelu. Postojeća iOS kompatibilnost ostaje,
a iOS build, TestFlight i Apple račun dolaze tek nakon stabilnog Androida.
Backend i cloud uvode se samo ako lokalna beta pokaže stvarnu potrebu.
Ova odluka ima prednost pred starijim redoslijedom faza u ovom dokumentu.

Suplementi se uklapaju u postojeće kategorije i dnevne termine. Paket sadrži
kreatin (3 tablete), magnezij, Omega-3 i multivitamin (po 1 tabletu).
Jedan dodir znači cijelu prikazanu dozu; nema brojanja pojedinačnih tableta
ni medicinskih preporuka. Oznaka doze pripada verziji rasporeda i kopira se
u zapis izvršenja. Promjena vrijedi od sutra; naknadni unos koristi dozu
važeću na odabranom datumu, a promjena vremena postojećeg zapisa zadržava
njegovu spremljenu dozu. Stari zapisi bez doze zadržavaju praznu vrijednost.

Plan i dokazi: [Suplementi](SUPPLEMENTS_PLAN.md).

Verzija: 1.0
Status: produktni ugovor za Fazu 0
Datum odluke: 25. srpnja 2026.

Ovaj dokument precizira ponašanje proizvoda opisano u
[`MASTER_PLAN.md`](MASTER_PLAN.md). Ako se dokumenti razilaze oko ponašanja
korisničke funkcije, ova specifikacija ima prednost. Master-plan i dalje
određuje redoslijed razvoja i tehnološki smjer.

## 1. Definicija proizvoda

### Problem

Aktivnosti osobne higijene i njege nemaju isti ritam:

- neke se obavljaju više puta dnevno
- neke samo određenim danima
- neke tek nakon što prođe određeni broj dana od posljednjeg izvršenja
- neke nemaju raspored, ali je korisno znati kada su posljednji put obavljene

Običan checklist zaboravlja povijest, a generički habit tracker često sve
pretvara u dnevni niz, postotak ili natjecanje. Zbog toga korisnik nema brz i
smiren odgovor na tri važna pitanja:

1. Što je relevantno danas?
2. Kada sam ovo posljednji put obavio?
3. Kakav je moj stvarni ritam kroz vrijeme?

### Ciljani korisnik

Primarni korisnik je osoba koja želi jednostavno pratiti vlastitu higijenu i
njegu na telefonu, bez vođenja tablica, bez obveznog računa i bez društvenih
funkcija.

Korisnik ne mora unaprijed poznavati sustave navika. Aplikacija treba ponuditi
dobre predloške, ali ne smije nametati medicinske preporuke ni jedan
„ispravan” ritam njege.

### Glavna vrijednost

> Korisnik otvori Higio, jednim dodirom evidentira obavljenu aktivnost i odmah
> nastavi s danom.

Higio dodatno pamti kontekst: kojem je planiranom terminu izvršenje pripadalo,
kada se dogodilo, kada aktivnost ponovno dolazi na red i kako izgleda njezina
povijest.

### Produktna načela

1. Uobičajeno evidentiranje traje jedan dodir.
2. Aplikacija radi bez interneta.
3. Registracija nije uvjet za korištenje.
4. Korisnik može ispraviti svaku pogrešnu evidenciju.
5. Propuštena aktivnost nije moralna ocjena.
6. Statistika mora biti objašnjiva stvarnim terminima i zapisima.
7. Promjena današnjeg rasporeda ne smije prepisati prošlost.
8. Predlošci ubrzavaju početak, ali sve ostaje prilagodljivo.
9. Privatni sadržaj ne ulazi u telemetriju ili logove.
10. Složenost se uvodi tek kada rješava dokazani problem.

### Što Higio jest

- osobni tracker higijene i njege
- dnevni pregled relevantnih aktivnosti
- evidencija izvršenja i povijesti
- podsjetnik kada nešto dolazi na red
- lokalno-prva mobilna aplikacija
- alat za smiren pregled ritma, a ne za stvaranje krivnje

### Što Higio nije

- generički tracker svih životnih navika
- medicinska aplikacija
- dijagnostički alat
- društvena mreža
- sustav natjecanja, bodova i obveznih streakova
- zamjena za liječnika, stomatologa ili drugog stručnjaka
- javni profil korisnikovih rutina
- cloud-first proizvod koji ne radi bez mreže

### Lokalni MVP

Lokalni MVP obuhvaća:

- onboarding bez registracije
- početne predloške
- stvaranje i uređivanje aktivnosti
- četiri vrste rasporeda
- ekran Danas
- evidentiranje jednim dodirom
- poništavanje neposrednog evidentiranja
- naknadni unos i ispravak
- povijest
- osnovnu tjednu i mjesečnu statistiku
- posljednje izvršenje i prosječni razmak
- lokalne, opcionalne podsjetnike
- pauziranje i arhiviranje aktivnosti
- lokalni izvoz i povrat podataka prije javne objave

### Namjerno odgođeno

- korisnički račun i cloud sinkronizacija
- .NET backend i PostgreSQL
- dijeljenje podataka i obiteljski računi
- pametni sat i home-screen widget
- praćenje zaliha i proizvoda
- AI
- medicinske preporuke
- plaćanja i pretplate
- web i desktop klijent

## 2. Temeljni pojmovi

### Aktivnost

Definicija onoga što korisnik prati, primjerice „Pranje zubi”. Aktivnost ima
naziv, kategoriju, izgled, stanje i aktivnu verziju rasporeda.

### Verzija rasporeda

Pravila aktivnosti koja vrijede od određenog lokalnog datuma i vremena.
Uređivanje rasporeda stvara novu verziju umjesto prepisivanja stare. Stare
verzije ostaju dostupne za ispravan izračun povijesti.

### Planirani termin

Jedno očekivano izvršenje aktivnosti. Dnevni jutarnji i večernji slot dva su
različita termina.

Planirani termin konceptualno ima stabilan identitet izveden iz:

- aktivnosti
- verzije rasporeda
- lokalnog datuma kojem termin pripada
- slota ili intervalnog roka

Implementacija identiteta bit će određena u fazi modeliranja baze, ali
ponašanje mora ostati jednako.

### Izvršenje

Činjenica da je korisnik evidentirao aktivnost. Izvršenje ima vlastiti ID i
stvarno vrijeme. Ono se povezuje s najviše jednim planiranim terminom.

### Slot

Imenovani dio rutinskog dana, primjerice:

- jutro
- tijekom dana
- večer
- prilagođeni slot

Slot može imati preporučeno vrijeme za redoslijed i podsjetnik. U lokalnom
MVP-u slot nije strogi vremenski prozor za ocjenjivanje korisnika.

### Rutinski dan

Lokalni kalendarski datum kojem pripada planirani termin. U MVP-u traje od
lokalne ponoći do sljedeće lokalne ponoći.

## 3. Četiri vrste rasporeda

### 3.1 Dnevni slotovi

Koriste se kada je aktivnost planirana svaki aktivni dan, jednom ili više puta.

Primjeri:

- pranje zubi: jutro i večer
- njega kože: jutro i večer
- tuširanje: tijekom dana

Pravila:

- svaki konfigurirani slot stvara zaseban planirani termin za rutinski dan
- jutarnje izvršenje ne dovršava večernji termin
- svi termini dana mogu se evidentirati jednim dodirom na vlastitoj kartici
- preporučeno vrijeme utječe na redoslijed i podsjetnik, ne na negativno
  bodovanje
- neizvršeni termin postaje propušten tek nakon završetka rutinskog dana
- korisnik može evidentirati termin ranije ili kasnije istoga dana
- naknadni unos nakon završetka dana može propušteni termin pretvoriti u
  obavljeni termin

Odluka da slot u MVP-u nije strogi prozor smanjuje trenje i izbjegava situaciju
u kojoj je stvarno obavljena večernja higijena u 00:05 proglašena neuspjehom
samo zbog proizvoljne granice. Fleksibilniji noćni rutinski dan može se
razmotriti nakon stvarnog korištenja.

### 3.2 Odabrani dani u tjednu

Koriste se kada se aktivnost ponavlja određenim lokalnim danima.

Primjeri:

- pranje kose ponedjeljkom, četvrtkom i subotom
- promjena ručnika nedjeljom

Pravila:

- korisnik odabire najmanje jedan dan u tjednu
- odabrani dan može imati jedan ili više slotova
- na neodabranom danu aktivnost nema planirani termin
- neizvršeni termin odabranog dana postaje propušten nakon završetka tog
  rutinskog dana
- promjena odabranih dana primjenjuje se od početka nove verzije rasporeda
- prošli termini ostaju vezani uz verziju koja je tada vrijedila

Tjedan za prikaz počinje prema lokalnoj postavci korisnika. Interna pravila ne
smiju pretpostaviti da tjedan uvijek počinje nedjeljom.

### 3.3 Interval svakih N dana ili tjedana

Koristi se kada novi termin prirodno ovisi o posljednjem stvarnom izvršenju.

Primjeri:

- rezanje noktiju svakih 14 dana
- promjena posteljine svakih 14 dana
- zamjena četkice svakih 90 dana

#### Glavna odluka

Sljedeći termin računa se od lokalnog datuma posljednjeg stvarnog izvršenja, a
ne prema fiksnom kalendarskom nizu.

Razlog: ako korisnik odreže nokte tri dana kasnije od prvotnog roka, prirodnije
je ponovno brojiti 14 dana od stvarnog rezanja nego sljedeći termin prikazati
već za 11 dana.

Pravila:

- prije prvog izvršenja korisnik ili predložak određuje prvi datum dospijeća
- nakon izvršenja: `sljedeći datum = lokalni datum izvršenja + N`
- kada datum dospijeća stigne, postoji jedan aktivan intervalni termin
- ako nije izvršen, isti termin ostaje zakašnjeli; ne generira se novi
  propušteni termin za svaki sljedeći dan
- zakašnjelo izvršenje zatvara taj termin i pokreće novi interval od stvarnog
  lokalnog datuma izvršenja
- ručni naknadni unos može promijeniti sljedeći datum jer predstavlja stvarno
  vrijeme izvršenja
- promjena vrijednosti N stvara novu verziju rasporeda
- nova verzija računa prvi novi rok od posljednjeg poznatog izvršenja; ako ga
  nema, od datuma početka nove verzije

Za intervalne aktivnosti primarna statistika nije postotak dnevne uspješnosti.
Prikazuju se posljednje izvršenje, prosječni razmak, broj izvršenja i koliko je
izvršenja bilo do datuma dospijeća.

#### Preskakanje intervalnog termina

Izričita akcija `Preskoči i započni novi interval`:

- zatvara trenutačni termin kao preskočen
- ne stvara izvršenje
- novi interval računa se od lokalnog datuma preskakanja

Naziv akcije mora jasno objasniti da korisnik resetira odbrojavanje. Običan
odlazak iz aplikacije ne preskače termin.

### 3.4 Bez rasporeda

Koristi se kada korisnik želi povijest bez očekivanog termina.

Primjeri:

- brijanje
- odlazak frizeru
- čišćenje tenisica

Pravila:

- aktivnost nema planirane termine
- nikada nije propuštena ni zakašnjela
- može se evidentirati više puta istoga dana
- ekran Danas može je prikazati u odjeljku brzih aktivnosti ako ju korisnik
  ondje prikvači
- prikazuju se posljednje izvršenje, broj izvršenja i prosječni razmak
- ne prikazuje se postotak izvršenja jer ne postoji nazivnik

## 4. Statusi planiranog termina

Status je izveden iz rasporeda, lokalnog vremena, izvršenja i korisničke akcije.
Ne treba ga automatski spremati kao jedini izvor istine ako ga je moguće
pouzdano izračunati.

### Nadolazeće

Termin pripada današnjem ili budućem rutinskom danu i još nije obavljen.
Kasniji današnji slot može biti vizualno mirniji, ali ga je i dalje moguće
evidentirati.

### Dostupno za evidentiranje

Termin je na ekranu Danas i korisnik ga može dovršiti jednim dodirom. U MVP-u
su svi današnji termini dostupni cijeli rutinski dan.

### Obavljeno

Planirani termin ima povezano važeće izvršenje. Jedno izvršenje može dovršiti
najviše jedan termin.

### Propušteno

Fiksni dnevni ili tjedni termin nije obavljen ni izričito preskočen prije kraja
rutinskog dana.

Propušteno nije isto što i intervalno kašnjenje. Propušteni termin je zatvoreni
povijesni rezultat, ali ga naknadni unos može ispraviti.

### Zakašnjelo

Intervalnom terminu prošao je datum dospijeća, a nije obavljen ni preskočen.
Ostaje jedan aktivan zakašnjeli termin sve dok ga korisnik ne zatvori.

Korisnički tekst treba biti neutralan, primjerice `Na redu od 12. srpnja`, a ne
`Kasniš 13 dana`.

### Preskočeno

Korisnik je izričito odlučio ne izvršiti konkretan planirani termin.

- za dnevni ili tjedni termin zatvara samo taj termin
- za intervalni termin koristi jasno označenu akciju koja započinje novi
  interval
- preskakanje nije isto što i pauziranje aktivnosti

### Pauzirano

Aktivnost ili raspored ne generira planirane termine u zadanom razdoblju.
Pauzirani dani ne ulaze u nazivnik statistike.

Povijest prije pauze ostaje nepromijenjena.

### Nije planirano

Za taj lokalni dan ne postoji planirani termin ili aktivnost uopće nema
raspored. To nije negativan status.

## 5. Evidentiranje aktivnosti

### One-tap tok

Za planiranu karticu na ekranu Danas:

1. korisnik dodirne karticu ili njezinu veliku akciju
2. aplikacija odmah stvara izvršenje s trenutačnim vremenom
3. izvršenje se povezuje s točno tim terminom
4. kartica odmah prelazi u obavljeno stanje
5. uređaj daje kratku, nenametljivu haptiku
6. prikazuje se kratka full-screen potvrda nalik modalnoj success poruci
7. potvrda prikazuje aktivnost, zagrebačko vrijeme i akciju `Poništi`
8. potvrda se sama zatvara nakon približno 2,4 sekunde, a `Poništi` zatim
   ostaje dostupan u nenametljivom snackbar prikazu

Full-screen poruka potvrđuje već dovršen upis; ne otvara obrazac i ne traži
dodatnu potvrdu korisnika.

Ako trajni upis ne uspije, optimistička promjena vraća se i aplikacija jasno
kaže da zapis nije spremljen.

### Poništavanje

- akcija `Poništi` uklanja upravo stvoreno izvršenje
- termin se vraća u prethodno izvedeno stanje
- poništavanje mora raditi i nakon brze serije evidentiranja; svaka poruka mora
  znati koji zapis poništava
- nakon isteka poruke zapis se i dalje može ukloniti kroz Povijest

### Ponovni dodir istog termina

- već obavljena planirana kartica ne stvara drugo izvršenje običnim dodirom
- dodir otvara kratke detalje ili ne radi ništa, ovisno o završnom UX prototipu
- dodatno izvršenje moguće je kroz izričitu akciju `Evidentiraj ponovno`
- drugo izvršenje ne može ponovno povećati broj dovršenih planiranih termina

### Više dopuštenih izvršenja

- aktivnost bez rasporeda dopušta više izvršenja dnevno
- planirana aktivnost također može imati dodatne zapise, ali samo je jedan
  primarno povezan s konkretnim terminom
- dodatni zapisi ulaze u povijest i broj izvršenja, ne u dvostruki uspjeh

### Ručni odabir drugog vremena

Dugi pritisak ili izbornik kartice omogućuje `Evidentiraj drugo vrijeme`.
Korisnik bira lokalni datum i vrijeme. Aplikacija prije spremanja pokazuje
kojem će se otvorenom terminu zapis pridružiti.

### Naknadni unos

- korisnik odabire aktivnost te lokalni datum i vrijeme
- aplikacija predlaže najbliži kompatibilni neobavljeni termin
- korisnik može potvrditi prijedlog ili spremiti dodatni zapis bez termina
- naknadni unos može promijeniti propušteni fiksni termin u obavljeni
- za intervalni raspored naknadni unos ponovno računa sljedeći rok

### Promjena vremena

Promjena vremena postojećeg izvršenja ponovno provjerava vezu s planiranim
terminom. Ako zapis više ne pripada starom terminu, aplikacija mora prije
spremanja pokazati učinak na povijest i sljedeći intervalni rok.

### Brisanje pogrešnog zapisa

- brisanje je izričita akcija iz detalja ili Povijesti
- traži potvrdu kada više nije dostupna neposredna akcija `Poništi`
- brisanje intervalnog izvršenja ponovno računa sljedeći rok iz prethodnog
  važećeg izvršenja ili početnog datuma
- za buduću sinkronizaciju brisanje će se modelirati tombstone zapisom

### Evidentiranje cijele rutine

Rutina je skup pojedinačnih aktivnosti i uvodi se nakon stabilnog one-tap toka.

- `Evidentiraj cijelu rutinu` stvara zasebno izvršenje za svaki nedovršeni
  korak
- već obavljeni korak ne dobiva duplikat
- poruka `Poništi` poništava samo zapise stvorene tom grupnom akcijom
- korisnik nakon grupne akcije može zasebno ispraviti pojedini korak

## 6. Pravila statistike

### Fiksni dnevni i tjedni termini

Za odabrano razdoblje:

- **planirani nazivnik** čine termini čiji je rutinski dan završen te termini
  koji su već obavljeni ili izričito preskočeni tijekom tekućeg dana
- budući termini i neobavljeni kasniji termini tekućeg dana ne ulaze još u
  nazivnik
- **obavljeni brojnik** čine planirani termini s jednim povezanim važećim
  izvršenjem
- dodatna izvršenja istog termina ne povećavaju brojnik
- **uspješnost** je `obavljeni / planirani × 100`
- ako nema planiranih termina, postotak se ne prikazuje

### Pauzirani dani

Pauza ne generira termin. Zato pauzirani dani ne ulaze ni u brojnik ni u
nazivnik.

### Preskočeni termini

Preskočeni fiksni termin ostaje planiran i ulazi u nazivnik, ali ne u obavljeni
brojnik. U rezultatima se prikazuje zasebno kao preskočen kako broj ne bi
izgledao kao greška sustava.

### Propušteni termini

Propušteni termin ulazi u nazivnik, ne u brojnik. Naknadno povezano izvršenje
premješta ga u obavljeno i legitimno mijenja statistiku tog povijesnog
razdoblja.

### Promjena rasporeda

- svaka promjena stvara novu verziju s datumom početka
- termini prije početka nove verzije računaju se prema staroj verziji
- promjena dana, slotova ili intervala ne prepisuje prošle termine
- dopuštena korekcija samog povijesnog rasporeda mora biti zasebna napredna
  akcija i nije dio lokalnog MVP-a

### Naknadno evidentiranje

Naknadni zapis ulazi u razdoblje lokalnog datuma kojem stvarno pripada. Može
promijeniti povijesni rezultat jer ispravlja evidenciju, ali promjena mora biti
vidljiva u Povijesti.

### Intervalne aktivnosti

Primarne metrike:

- datum i vrijeme posljednjeg izvršenja
- trenutačni sljedeći rok
- broj izvršenja u razdoblju
- prosječni razmak između uzastopnih izvršenja
- medijan razmaka kada postoji dovoljno podataka
- broj izvršenja obavljenih do roka i nakon roka

Za intervalne aktivnosti ne prikazujemo klasičnu dnevnu uspješnost. Ako se
prikazuje `na vrijeme`, nazivnik su zatvoreni intervalni termini, a ne dani.

### Aktivnosti bez rasporeda

Prikazuju:

- posljednje izvršenje
- ukupan broj izvršenja u razdoblju
- prosječni i po potrebi medijalni razmak

Ne prikazuju:

- propuštene dane
- zakašnjenje
- postotak uspješnosti

### Posljednje izvršenje

Najnoviji važeći `occurredAtUtc` za aktivnost. Brisani zapisi ne ulaze u
izračun.

### Prosječni razmak

Zapisi se poredaju prema stvarnom vremenu. Izračunaju se razmaci između svakog
para uzastopnih važećih izvršenja, a zatim njihova aritmetička sredina.

Metrika se ne prikazuje dok ne postoje najmanje dva izvršenja. Ekstremne
vrijednosti ne uklanjaju se potajno; medijan kasnije može dati dodatni kontekst.

## 7. Vrijeme i vremenske zone

### Što se sprema uz izvršenje

Svako izvršenje čuva najmanje:

- stvarni trenutak kao UTC timestamp
- IANA vremensku zonu `Europe/Zagreb`
- UTC pomak u tom trenutku
- nepromjenjivi lokalni datum kojem je korisnik pripisao izvršenje
- lokalno vrijeme prikaza u trenutku unosa

UTC je izvor za apsolutni redoslijed, a spremljeni lokalni datum izvor za
grupiranje u korisnikovoj povijesti.

### Planirani termini

- današnji datum i budući termini računaju se u kućnoj IANA zoni
  `Europe/Zagreb`
- vremenska zona uređaja ne mijenja raspored lokalnog MVP-a
- završeni termini zadržavaju izvorni lokalni datum i zonu
- stari zapis ne smije prijeći na susjedni dan samo zato što ga korisnik
  pregledava iz druge zone

### Ljetno i zimsko računanje vremena

- kalendarska pravila koriste zonu, ne fiksni UTC pomak
- nepostojeće lokalno vrijeme podsjetnika pomiče se na prvo valjano vrijeme
- dvostruko lokalno vrijeme ne smije stvoriti dva termina
- datum i slot, a ne sirovi UTC timestamp, određuju identitet fiksnog termina

### Putovanje

Lokalni MVP namjerno nastavlja pratiti `Europe/Zagreb` i kada uređaj promijeni
zonu. Time su Danas, povijest i intervali predvidljivi za početnog korisnika.
Završeni zapisi u svakom slučaju čuvaju vlastiti lokalni datum, zonu i tadašnji
UTC pomak.

Automatsko praćenje zone uređaja i korisnički izbor druge kućne zone odgađaju
se dok za njih ne postoji jasan produktni zahtjev.

## 8. Referentne aktivnosti

### 8.1 Pranje zubi

Konfiguracija:

- vrsta: dnevni slotovi
- slotovi: Jutro i Večer
- preporučena vremena: korisnički prilagodljiva

Na ekranu Danas:

- dvije zasebne kartice ili dva jasno odvojena koraka
- večernji termin može izgledati kao nadolazeći, ali se može evidentirati

Nakon evidentiranja:

- dovršava se samo dodirnuti slot
- prikazuju se haptika i `Poništi`

Ako nije obavljeno:

- neizvršeni slot postaje propušten nakon kraja rutinskog dana
- drugi slot ostaje neovisan

Smislena statistika:

- obavljeno od planiranog
- jutarnja i večernja dosljednost zasebno
- tjedni i mjesečni trend
- posljednje izvršenje

### 8.2 Tuširanje

Konfiguracija:

- vrsta: dnevni slot
- slot: Tijekom dana

Na ekranu Danas:

- jedna kartica

Nakon evidentiranja:

- današnji termin postaje obavljen

Ako nije obavljeno:

- nakon kraja rutinskog dana postaje propušteno

Smislena statistika:

- obavljeno od planiranog
- tjedni i mjesečni trend
- posljednje izvršenje

Predložak ne smije tvrditi da je svakodnevni ritam medicinski obvezan.

### 8.3 Pranje kose

Moguća konfiguracija A:

- vrsta: odabrani dani
- dani: ponedjeljak, četvrtak i subota

Moguća konfiguracija B:

- vrsta: interval
- svaka 3 dana od posljednjeg izvršenja

Na ekranu Danas:

- kod tjednog rasporeda prikazuje se samo odabranim danom
- kod intervala prikazuje se kada je na redu ili zakašnjelo

Nakon evidentiranja:

- tjedna varijanta zatvara današnji termin
- intervalna varijanta računa novi rok od lokalnog datuma izvršenja

Ako nije obavljeno:

- tjedna varijanta postaje propuštena na kraju dana
- intervalna ostaje jedan zakašnjeli termin

Smislena statistika:

- tjedna varijanta: obavljeno od planiranog
- intervalna varijanta: posljednje izvršenje, prosječni razmak i izvršenja do
  roka

### 8.4 Rezanje noktiju

Konfiguracija:

- vrsta: interval
- svakih 14 dana
- prvi rok: korisnički odabran ili izveden iz početnog unosa

Na ekranu Danas:

- prije roka može biti u nadolazećem pregledu
- na datum roka pojavljuje se kao aktivna kartica
- nakon roka ostaje `Na redu od [datum]`

Nakon evidentiranja:

- sljedeći rok postaje lokalni datum izvršenja + 14 dana

Ako nije obavljeno:

- ne nastaju dnevni propušteni zapisi
- postoji jedan zakašnjeli intervalni termin

Smislena statistika:

- posljednje izvršenje
- prosječni i medijalni razmak
- broj izvršenja
- izvršenja do roka i nakon roka

### 8.5 Brijanje

Konfiguracija:

- vrsta: bez rasporeda
- opcionalno prikvačeno u brze aktivnosti

Na ekranu Danas:

- nije obvezna kartica
- može biti dostupno pod `Brze aktivnosti`

Nakon evidentiranja:

- stvara se novi zapis s trenutačnim vremenom
- dopušteno je ponovno evidentiranje

Ako nije obavljeno:

- nema propuštenog ni zakašnjelog statusa

Smislena statistika:

- posljednje izvršenje
- broj izvršenja
- prosječni i medijalni razmak

## 9. Glavni korisnički tokovi

### 9.1 Prvi ulazak

Tok:

1. korisnik vidi kratko objašnjenje vrijednosti
2. nije prisiljen otvoriti račun
3. bira `Odaberi predloške` ili `Počni prazno`

Očekivani rezultat:

- put do korisnog ekrana Danas traje manje od minute

Rubni slučajevi:

- prekid onboardinga ne gubi već potvrđeni odabir
- odbijanje obavijesti ne blokira aplikaciju
- aplikacija ne traži dozvolu za obavijesti prije nego što korisnik uključi
  konkretan podsjetnik

### 9.2 Odabir predložaka

Tok:

1. korisnik vidi mali broj grupiranih prijedloga
2. može pregledati i prilagoditi ritam
3. potvrdom se stvaraju aktivnosti

Očekivani rezultat:

- nema dupliciranih aktivnosti
- predložak je prijedlog, ne medicinska preporuka

Rubni slučajevi:

- ponovni ulazak u onboarding ne stvara duplikate
- korisnik može odabrati samo dio predloška

### 9.3 Dolazak na Danas

Tok:

1. aplikacija učita lokalnu bazu
2. izračuna termine za trenutačni rutinski dan
3. prikaže ih po slotovima i stanju

Očekivani rezultat:

- ekran radi bez mreže
- obavljene i neobavljene kartice jasno se razlikuju

Rubni slučajevi:

- nema aktivnosti
- sve je obavljeno
- promjena datuma dok je aplikacija otvorena
- promjena vremenske zone
- pogreška lokalne migracije mora dati siguran oporavak, ne tihi gubitak

### 9.4 Evidentiranje jednim dodirom

Tok je definiran u odjeljku 5.

Očekivani rezultat:

- trajni zapis i povratna informacija u manje od dvije sekunde

Rubni slučajevi:

- dvostruki brzi dodir ne stvara duplikat za isti termin
- neuspjeli upis vraća UI
- dodatni dodir već obavljene kartice nije novo izvršenje

### 9.5 Poništavanje

Tok:

1. korisnik bira `Poništi`
2. briše se točno izvršenje stvoreno prethodnom akcijom
3. kartica se vraća u prethodno stanje

Rubni slučajevi:

- više brzih evidencija
- grupna rutina
- poruka je istekla: zapis se i dalje može urediti u Povijesti

### 9.6 Dodavanje vlastite aktivnosti

Tok:

1. naziv i opcionalna kategorija
2. izbor jedne od četiri vrste rasporeda
3. samo polja relevantna toj vrsti
4. pregled rezultata
5. spremanje

Očekivani rezultat:

- jednostavna aktivnost stvara se za manje od 30 sekundi

Rubni slučajevi:

- prazan naziv
- nijedan odabrani dan
- interval manji od 1
- dva slota istog identiteta
- datum prvog roka u prošlosti

### 9.7 Naknadno evidentiranje

Tok:

1. korisnik iz Povijesti ili detalja bira dodavanje
2. bira aktivnost, datum i vrijeme
3. aplikacija predlaže kompatibilni termin
4. korisnik potvrđuje

Očekivani rezultat:

- Povijest, Danas i statistika odmah se usklađuju

Rubni slučajevi:

- termin već ima izvršenje
- raspored je od tada promijenjen
- zapis prethodi nastanku aktivnosti
- promjena intervalnog sljedećeg roka

### 9.8 Pregled povijesti

Tok:

1. vremenska crta grupirana po spremljenom lokalnom datumu
2. filtriranje po aktivnosti i kategoriji
3. otvaranje detalja zapisa

Očekivani rezultat:

- korisnik može objasniti svaki rezultat statistike

Rubni slučajevi:

- putovanje kroz vremenske zone
- brisani zapis
- više izvršenja istoga dana

### 9.9 Pregled statistike

Tok:

1. korisnik bira razdoblje
2. vidi sažetak primjeren vrsti rasporeda
3. može otvoriti detalje koji vode do povijesnih zapisa

Očekivani rezultat:

- fiksni rasporedi i intervali ne koriste isti neprimjereni postotak

Rubni slučajevi:

- nema dovoljno podataka
- razdoblje bez planiranih termina
- pauza
- promjena rasporeda usred razdoblja

### 9.10 Uređivanje ili pauziranje

Tok:

1. korisnik otvara aktivnost
2. mijenja podatke ili raspored
3. aplikacija prikazuje datum početka promjene
4. spremanje stvara novu verziju rasporeda

Očekivani rezultat:

- budućnost se mijenja, povijest ostaje ista

Rubni slučajevi:

- otvoreni zakašnjeli intervalni termin
- uklanjanje jednog od više dnevnih slotova
- pauziranje tijekom dana
- ponovno aktiviranje nakon pauze

Za MVP vrijedi:

- pauza počinje od lokalnog datuma potvrde
- već obavljeni današnji termini ostaju obavljeni
- neobavljeni današnji termini od trenutka pauze ne ulaze u konačni nazivnik
- ponovno aktiviranje stvara novu verziju od odabranog lokalnog datuma

## 10. Odluke važne za podatkovni model

Faza modeliranja baze mora podržati:

- stabilne ID-eve aktivnosti, izvršenja i verzija rasporeda
- verzioniranje rasporeda s razdobljem valjanosti
- više slotova po verziji
- izvršenje povezano s najviše jednim terminom
- dodatna izvršenja bez termina
- nepromjenjivi spremljeni lokalni datum izvršenja
- UTC timestamp, IANA zonu i UTC pomak
- pauze bez generiranja planiranih termina
- izričito preskočene termine
- soft delete/tombstone spreman za kasniju sinkronizaciju
- transakcijsko one-tap spremanje
- idempotentnost protiv dvostrukog dodira

Specifikacija ne zahtijeva da se svaki budući planirani termin unaprijed spremi u
bazu. Dopušteno je determinističko generiranje iz verzija rasporeda, uz trajno
spremanje korisničkih odluka i izvršenja.

## 11. Definition of Done za Fazu 0

| Kriterij | Status | Dokaz |
|---|---|---|
| Četiri vrste rasporeda imaju jednoznačna pravila | Završeno | Odjeljak 3 |
| Pet referentnih aktivnosti modelirano je bez posebnih hakova | Završeno | Odjeljak 8 |
| Propušteno i zakašnjelo jasno su odvojeni | Završeno | Odjeljak 4 |
| Statistički nazivnik je objašnjiv | Završeno | Odjeljak 6 |
| Promjena rasporeda ne mijenja staru povijest | Završeno | Verzije rasporeda |
| One-tap tok je precizno definiran | Završeno | Odjeljak 5 |
| Pravila vremenskih zona čuvaju izvorni lokalni dan | Završeno | Odjeljak 7 |
| Nema otvorene odluke koja mijenja osnovnu strukturu baze | Završeno | Odjeljak 10 |

Faza 0 je zaključena. Sitne vrijednosti dizajna, poput točnih preporučenih
vremena predložaka, mogu se potvrditi u UX fazi bez promjene domenskog modela.

## 12. Sljedeća funkcionalna vertikala

Nakon tehničkog scaffolda prva poslovna vertikala ostaje:

> lokalna aktivnost → današnji planirani termin → evidentiranje jednim dodirom
> → spremljeno izvršenje → poništavanje

Ta vertikala mora biti provjerena na stvarnom telefonu prije proširenja na
potpunu Povijest, Statistiku ili cloud.

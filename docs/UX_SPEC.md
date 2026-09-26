# Higio UX kostur — Faza 2

Ovaj dokument opisuje tehnički UX kostur koji prethodi lokalnoj bazi i
domenskoj jezgri. PRODUCT_SPEC ostaje izvor istine za produktna pravila.

## Cilj faze

Korisnik mora bez uputa prepoznati glavni tok:

1. otvori karticu **Danas**
2. pronađe planiranu aktivnost
3. dodirne cijelu karticu
4. odmah vidi dovršeno stanje
5. po potrebi odabere **Poništi**

Interakcija u ovoj fazi namjerno nije trajna. Ponovno pokretanje aplikacije
vraća ogledne podatke. SQLite, rasporedi i stvarni logovi pripadaju sljedećim
fazama.

## Navigacija

Donja navigacija ima četiri stalne destinacije:

| Kartica | Svrha |
| --- | --- |
| Danas | planirane aktivnosti i one-tap evidentiranje |
| Povijest | kronološki pregled evidentiranja |
| Statistika | mirni, objašnjivi trendovi |
| Više | aktivnosti, rutine, postavke i informacije |

Za Fazu 2 koristi se stabilni JavaScript `Tabs` API iz Expo Routera. Rute su
tanke i samo povezuju navigaciju s feature ekranima.

## Vizualni smjer

- Mobile-first raspored s jednom glavnom kolonom.
- Mirna zelena paleta koja komunicira njegu, a ne medicinski nadzor.
- Sistemska tipografija radi brzine, dostupnosti i prirodnog skaliranja.
- Svijetla i tamna tema prate postavku uređaja.
- Kartice i kontrole imaju najmanje 48 px dodirne površine.
- Tekst ostaje skalabilan; aplikacija ne isključuje sistemsko povećanje fonta.
- Statusi koriste tekst i oblik, ne samo boju.

## Design tokeni

Centralno su definirani:

- semantičke boje za pozadinu, površine, tekst, obrube i stanja
- tipografska skala
- razmaci
- radijusi
- minimalna dodirna površina
- svijetla i tamna tema

UI ne smije izravno uvoditi novu paletu bez dopune tokena.

## Osnovne komponente

Faza uključuje:

- `AppText`
- `Screen`
- `Surface`
- `ActivityCard`
- `AppButton`
- `ToggleRow`
- `AppTextField`
- `AppSheet`
- `Snackbar`
- `EmptyState`
- `TabGlyph`

Komponente su namjerno male. Ne uvodimo veliku UI biblioteku ni apstrakcije
koje još nemaju stvarnu uporabu.

## One-tap prototip

Dodir nedovršene kartice:

1. odmah mijenja lokalno React stanje
2. karticu prikazuje kao obavljenu
3. ažurira dnevni napredak
4. šalje kratku potvrđujuću haptiku, ako je uključena
5. prikazuje kratku full-screen success potvrdu s vremenom i akcijom
   **Poništi**
6. potvrda se sama zatvara nakon približno 2,4 sekunde
7. snackbar zatim zadržava akciju **Poništi** tijekom 4,5 sekunde

Full-screen potvrda nije dodatni korak. Izvršenje je već spremljeno i korisnik
ne mora pritisnuti nikakav gumb da bi nastavio.

Ponovni dodir već dovršene kartice ne stvara duplikat. Ispravci i više
izvršenja jednog termina bit će implementirani tek uz pravi log i pravila iz
PRODUCT_SPEC-a.

## Statični podatci

Povijest i Statistika koriste jasno označene ogledne podatke. Ne predstavljaju
stvarno korisnikovo ponašanje i ne spremaju se. Time možemo provjeriti
informacijsku hijerarhiju bez preuranjene baze ili lažnih izračuna.

## Dostupnost

- Glavni naslovi imaju semantičku header ulogu.
- Kartica aktivnosti izgovara naziv, slot i moguću akciju.
- Dovršeno stanje izloženo je kroz accessibility state.
- Napredak ima tekstualni accessibility label.
- Interaktivne površine imaju barem 48 px.
- Haptika nije jedini signal i može se isključiti.

## Granica faze

Ova faza ne sadrži:

- SQLite ni Drizzle
- stvarne aktivnosti i rasporede
- trajne logove
- stvarne statističke izračune
- obavijesti
- autentifikaciju, backend ili sinkronizaciju

## Provjera završetka

Tehnički dio Faze 2 prolazi kada:

- četiri kartice rade kroz Expo Router
- light i dark tema koriste iste semantičke tokene
- one-tap, haptika i Poništi rade kao prototip
- lint, TypeScript i testovi prolaze
- web prikaz je vizualno pregledan u mobilnom viewportu

Konačni kriterij stvarnog uređaja ostaje otvoren dok Android SDK ili iOS build
ne budu dostupni.

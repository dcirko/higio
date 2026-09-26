# Izvještaj Faze 5 — potpuni scheduling engine

Datum: 26. srpnja 2026.

## Isporučeno

- sva četiri rasporeda u editoru aktivnosti:
  - jedan ili više dnevnih slotova
  - odabrani dani u tjednu
  - svakih N dana ili tjedana
  - bez fiksnog rasporeda
- datum početka praćenja i prvi očekivani datum intervala
- sljedeći očekivani termin u popisu aktivnosti
- interval usidren na zadnje stvarno izvršenje
- jedan otvoreni overdue interval bez stvaranja duplikata za svaki dan kašnjenja
- odvojeni planirani i stvarni datum zakašnjelog izvršenja
- brze aktivnosti bez rasporeda, ponovljive više puta dnevno
- brze aktivnosti odvojene od planiranog dnevnog postotka
- sigurne verzije rasporeda: izmjena vrijedi najranije od sutra
- neutralan overdue tekst bez posramljujućeg tona
- prošireni domenski, store i UI testovi

## Ključna pravila

### Interval

Prvi termin dolazi iz `firstDueLocalDate`. Nakon stvarnog izvršenja sljedeći
termin računa se od lokalnog datuma tog izvršenja, ne od starog kalendarskog
plana. To prirodnije odgovara rezanju noktiju, mijenjanju posteljine i sličnim
rutinama osobne njege.

Ako aktivnost kasni, Higio prikazuje jednu stavku `Na redu od ...`. Evidentiranje
zatvara taj termin, sprema izvorni planirani datum i stvarni trenutak u
`Europe/Zagreb`, zatim računa novi interval.

### Bez rasporeda

Takva aktivnost nema planirane termine, propušten status ni postotak
uspješnosti. Prikazuje se među brzim aktivnostima, pamti posljednje izvršenje i
svaki dodir sprema kao zaseban log.

### Promjena rasporeda

Naziv, opis i izgled mijenjaju se odmah. Izmijenjeni raspored dobiva novu
verziju koja vrijedi najranije od sutra. Stara verzija ostaje vezana uz stare
termine i logove, pa današnja izmjena ne mijenja povijest.

## Automatska provjera

- `npm run lint`: prolazi bez upozorenja
- `npm run typecheck`: prolazi
- `npm test -- --watch=false`: 5 suiteova i 20 testova prolazi
- `npm run format:check`: prolazi
- `npx expo-doctor`: 20/20 provjera prolazi
- Expo konfiguracija: SDK 57, React Native 0.86, Android package
  `com.domag.higio.dev`

Testna matrica pokriva:

- jutarnji i večernji dnevni slot
- početak rasporeda u budućnosti
- odabrane ISO dane tjedna
- interval u danima i tjednima
- računanje intervala od zadnjeg stvarnog izvršenja
- overdue termin s trajnim occurrence ključem
- izostanak planiranih termina za aktivnost bez rasporeda
- više logova neplanirane aktivnosti istoga dana
- dnevni postotak koji uključuje samo planirane termine
- one-tap potvrdu, undo i ponovno učitavanje spremljenih podataka

## Native provjera

Na Pixel 7 AVD-u `Higio_API_36` s Androidom 16 / API 36 provjereno je:

- pokretanje postojećeg development builda i učitavanje stvarne SQLite baze
- prikaz intervalne aktivnosti `Rezanje noktiju`
- prikaz `Brijanja` u zasebnoj skupini brzih aktivnosti
- izostavljanje brzih aktivnosti iz dnevnog postotka
- dva uzastopna evidentiranja iste brze aktivnosti
- full-screen native potvrda i `Poništi`
- prikaz stvarnog zagrebačkog lokalnog vremena
- sva četiri tipa rasporeda u native editoru
- intervalne kontrole: N, dan/tjedan i prvi očekivani datum
- izostanak fatalnih React Native i SQLite grešaka u logcatu

Poziv haptike izvršava se u istom potvrđenom one-tap toku. Subjektivnu jačinu
vibracije i dalje treba potvrditi na fizičkom telefonu jer emulator nema stvarni
taktilni osjećaj.

## Granica i sljedeći korak

Ručni unos proizvoljnog starog zapisa, promjena vremena i uklanjanje loga nisu
ugurani u scheduling editor. To su korisnički tokovi Faze 6 — Povijest i
ispravci.

Sljedeći vertikalni rez:

> SQLite logovi → vremenska crta Povijesti → ručni propušteni zapis → uređivanje
> vremena → sigurno uklanjanje → trenutno osvježavanje ekrana Danas

Backend, registracija, cloud sinkronizacija, podsjetnici i statistika ostaju
izvan ove faze.

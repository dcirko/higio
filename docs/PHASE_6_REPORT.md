# Faza 6 — povijest i ispravci

Datum završetka: 31. srpnja 2026.

## Ishod

Faza 6 zamijenila je statični primjer stvarnom vremenskom crtom iz lokalne
SQLite baze. Korisnik sada može pronaći, dodati i ispraviti izvršenja bez
izravnog rada s današnjim planom ili bazom.

## Isporučeno

- grupirana povijest po lokalnom zagrebačkom datumu
- razdoblja Danas, 7 dana, 30 dana i Sve
- dodatni filtri po aktivnosti i kategoriji
- ručni unos starog ili današnjeg izvršenja
- povezivanje ručnog unosa s konkretnim slobodnim planiranim terminom
- dodatno neplanirano izvršenje kada veza s rasporedom nema smisla
- promjena stvarnog datuma i vremena postojećeg zapisa
- detalj zapisa s posljednjih pet izvršenja iste aktivnosti
- potvrđeno soft brisanje i petosekundna akcija `Poništi`
- automatsko osvježavanje ekrana Danas nakon svake korekcije
- prazna, loading i error stanja

## Ključne tehničke odluke

`HistoryStore` je odvojen domenski ugovor. Android i iOS koriste
`SqliteHistoryStore`, dok web preview i testovi koriste isto memorijsko
spremište kao aktivnosti i ekran Danas. Svi storeovi dijele `StoreEvents`, pa
promjena u Povijesti odmah invalidira ostale prikaze.

Ručni unos planiranog termina čuva `occurrenceKey`, `scheduleVersionId`,
`slotId` i `plannedLocalDate`. Time naknadno večernje pranje zubi ne postaje
nepovezan zapis, nego ispravno zatvara baš propušteni večernji termin.

Stvarni trenutak nastavlja se spremati u UTC-u uz:

- IANA zonu `Europe/Zagreb`
- lokalni kalendarski datum
- lokalno vrijeme
- stvarni UTC offset

Pretvorba lokalnog unosa odbija vrijeme koje nije postojalo tijekom proljetnog
DST skoka. Kod dvostrukog jesenskog sata deterministički se koristi prvo
stvarno pojavljivanje i sprema njegov offset.

## Provjera

- TypeScript strict: prolazi
- ESLint / Expo lint: prolazi
- Prettier: prolazi
- Jest: 6 paketa, 26 testova, sve prolazi
- Expo Doctor: 20/20 provjera
- Expo kompatibilnost paketa: sve ovisnosti usklađene sa SDK-om 57
- Android API 36 emulator: potvrđeni SQLite timeline, filtri, detalj zapisa,
  ručni unos, brisanje, snackbar `Poništi` i trajno vraćanje zapisa
- nakon patch nadogradnje izgrađen je svjež debug APK, instaliran na
  `Higio_API_36` i ponovno su potvrđeni ekran Danas, Povijest te spremljeni log

Tehnološki patch baseline nakon faze:

- Expo 57.0.9
- React Native 0.86.2
- Expo Router 57.0.9
- Expo Dev Client 57.0.10

Read-only produkcijski `npm audit` prijavljuje samo transitive moderate nalaze
u Expo/Xcode build alatima. Predloženi automatski `--force` popravak spušta
`expo-splash-screen` na nekompatibilnu glavnu verziju, zato nije primijenjen.

## Sljedeće

Faza 7 uvodi lokalne podsjetnike putem Expo Notifications. Dozvola ostaje
opcionalna, obavijesti moraju biti ponovno planirane nakon promjene rasporeda,
a aplikacija mora ostati potpuno funkcionalna kada korisnik odbije dozvolu.

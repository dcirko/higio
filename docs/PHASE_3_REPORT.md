# Izvještaj Faze 3

Datum: 26. srpnja 2026.

## Isporučeno

- SQLite inicijalizacija s WAL načinom i uključenim stranim ključevima
- Drizzle shema i verzionirana migracija `0000_fantastic_vance_astro.sql`
- aktivnosti, verzije rasporeda, slotovi, dani tjedna, logovi i postavke
- UUID identifikatori i soft-delete polja za buduću sinkronizaciju
- čisti engine za dnevne, tjedne, intervalne i neplanirane aktivnosti
- `TodayStore` granica između UI-ja i pohrane
- transakcijsko i idempotentno one-tap evidentiranje
- početni podaci za pranje zubi, umivanje, tuširanje, pranje kose, njegu kože,
  nokte i brijanje
- full-screen success potvrda, automatsko zatvaranje i `Poništi`

## Vrijeme

Lokalni MVP koristi `Europe/Zagreb` kao kućnu zonu. Svaki mobilni SQLite log
sprema:

- UTC timestamp
- lokalni datum i vrijeme
- IANA zonu
- UTC pomak koji je vrijedio u trenutku evidentiranja

Testirane su obje DST promjene za 2026., kraj mjeseca i prijestupna godina.

## Provjera

- `npm run lint`: prolazi
- `npm run typecheck`: prolazi
- `npm test -- --watch=false`: 4 suitea i 13 testova prolaze
- Expo konfiguracija: SDK 57, React Native 0.86, `expo-sqlite` plugin aktivan
- Expo web export: prolazi i uključuje SQL migraciju
- ručni web preview: one-tap, modalna potvrda, reload i undo prolaze

Web preview namjerno koristi `localStorage`, ne SQLite. Expo SQLite podrška za
web je alfa i lokalni Expo server ne daje potrebna izolacijska zaglavlja.
Android/iOS i dalje koriste isključivo SQLite + Drizzle.

## Otvorena hardverska provjera

Android SDK/uređaj nisu dostupni kroz trenutačno okruženje, pa još nije stvarno
potvrđeno:

- instaliranje development builda
- zadržavanje SQLite loga nakon gašenja native aplikacije
- haptika na fizičkom uređaju
- izgled native `Modal` komponente na Androidu i iOS-u

To je prvi korak iduće sesije čim emulator ili uređaj budu dostupni.

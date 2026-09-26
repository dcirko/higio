# Higio Mobile

React Native aplikacija izgrađena s Expo SDK-om 57 i Expo Routerom.

Trenutačni lokalni beta kandidat uključuje SQLite aktivnosti, rasporede,
povijest, statistiku, lokalne podsjetnike, onboarding/rutine te verzionirani
JSON export/restore. Backup i sigurnosne kontrole nalaze se pod
`Više → Podatci i privatnost`.

## Preduvjeti

- Node.js 22.13 ili noviji
- npm
- Android Studio i Android SDK za lokalni Android build
- macOS/Xcode ili EAS Build za iOS build

## Instalacija

```powershell
npm install
```

## Provjere

```powershell
npm run lint
npm run typecheck
npm test
npm run format:check
```

## Pokretanje

Development client:

```powershell
npm start
```

Expo Go, dok projekt ne koristi nepodržane native module:

```powershell
npm run start:go
```

Lokalni Android development build nakon postavljanja Android SDK-a:

```powershell
npm run android
```

Varijanta aplikacije određuje se varijablom `APP_VARIANT`:

- `development`
- `preview`
- `production`

Tajne se ne smiju spremati u `EXPO_PUBLIC_*` varijable jer su vrijednosti
ugrađene u klijentsku aplikaciju.

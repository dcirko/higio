# Higio Maestro smoke tokovi

Tokovi ciljaju internu `preview` aplikaciju s ID-em
`com.domag.higio.preview`.

```powershell
maestro test .maestro/onboarding-and-one-tap.yaml
maestro test .maestro/privacy-and-backup-entry.yaml
```

Prvi tok samostalno briše podatke preview varijante, prolazi onboarding,
evidentira aktivnost i poništava zapis. Drugi pretpostavlja da je onboarding već
završen i provjerava ulaz u Phase 10 ekran.

Sistemski Android/iOS dijalozi za spremanje, dijeljenje i odabir JSON datoteke
namjerno ostaju dio ručne native provjere jer se njihov tekst razlikuje po
platformi i jeziku. Domenski round-trip i validacija formata pokriveni su Jest
testovima.

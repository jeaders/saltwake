# Percorso verso Expo / App Store

Saltwake è attualmente una web app React/Vite. Per pubblicarla su iOS e Android mantieni l'engine canvas e wrappalo con strumenti nativi leggeri invece di riscrivere il gioco.

## Opzione A — Capacitor (consigliata)

Mantieni Vite come build tool e aggiungi Capacitor per generare l'APK/IPA.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init saltwake com.jeaders.saltwake
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

- Build nativo: `npx cap open android` / `npx cap open ios`
- Le icone e lo splash screen si configurano in `android/` e `ios/`
- PWA già funzionante su web; Capacitor la incapsula come app nativa
- Pubblicazione: carica l'AAB su Google Play Console, l'IPA su App Store Connect

## Opzione B — Expo Web + EAS Build

Se vuoi gestire tutto da Expo:

1. Crea un progetto Expo separato
2. Puntalo alla build `dist/` come web entrypoint
3. Usa EAS Build per generare i binari nativi

Questo richiede più configurazione ma ti dà OTA updates e un'unica dashboard di deploy.

## Consigli

- Inizia da Capacitor: meno moving parts, stesso codice di gioco
- Aggiungi icone 512x512 e splash 1284x2778 per iOS/Android
- Testa prima su dispositivo reale (canvas 2D e audio hanno comportamenti diversi su mobile)
- Configura i permessi in `AndroidManifest.xml` e `Info.plist` se aggiungi funzionalità extra

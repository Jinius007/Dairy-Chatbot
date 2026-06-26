# Android app (Capacitor)

The APK bundles the React frontend built with **`VITE_CATALYST_API_URL`** pointing at your Catalyst function.

```bash
# .env.local must have VITE_CATALYST_API_URL set before build
npm run cap:sync
npm run cap:open
npm run android:apk
```

Requires internet — chat, voice, and call use the Catalyst + Sarvam backend.

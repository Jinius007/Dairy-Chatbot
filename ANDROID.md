# Pashu Mitra Android app (APK)

The Android app is a **Capacitor shell** that loads the live website:

**https://dairy-mitr.vercel.app**

No duplicate backend — chat, voice, call, and logging work exactly like the website. When you update Vercel, the app updates automatically (requires internet).

## Download APK (easiest)

1. Push this repo to GitHub (includes the `android/` folder and workflow).
2. Open **GitHub → Actions → Build Android APK → Run workflow** (or wait for push to `master`).
3. When the job finishes, download **PashuMitra-debug-apk** from **Artifacts**.
4. Copy the `.apk` to the phone and install (enable “Install unknown apps” if prompted).

## Build on your PC (Windows)

**Requirements:** Android Studio (SDK + JDK), ~2 GB free disk for Gradle.

```powershell
cd path\to\dairy-sakha
npm install
npm run build
npx cap sync android

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```

APK output:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Or open in Android Studio:

```powershell
npx cap open android
```

Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Permissions

The app requests **microphone** access for voice notes and live call mode.

## App id

`in.coop.pashumitra` — change in `capacitor.config.ts` if needed.

## Play Store release (optional)

For production, sign with a keystore and run:

```powershell
cd android
.\gradlew.bat assembleRelease
```

You must configure signing in `android/app/build.gradle` first.

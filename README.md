# Capacitor Standard

Blank Vite + React + Capacitor 7 + Supabase Auth scaffold (web, iOS, Android) with email/password, Google OAuth, and Apple OAuth (iOS). UI pattern mirrors [DemoLingoMock](../DemoLingoMock/).

## Prerequisites

- Node.js 18+
- For **Android**: Android Studio, JDK 17+
- For **iOS**: Xcode, CocoaPods (optional if you use SPM-only projects like this template)

## Setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

2. In the Supabase dashboard, configure **Authentication → URL Configuration → Redirect URLs**:

   - `http://localhost:3000`
   - `com.capacitor.standard://oauth-callback`

3. Enable **Google** and **Apple** under Authentication → Providers.

4. Install and run the web app:

   ```bash
   npm install
   npm run dev
   ```

5. Build and sync native projects:

   ```bash
   npm run build:mobile
   ```

   Or `npm run build` then `npx cap sync`.

6. Open native IDEs:

   ```bash
   npm run cap:open:ios
   npm run cap:open:android
   ```

## Renaming the app id

When you change `appId` in `capacitor.config.ts`, also update:

- `src/utils/platform.ts` (`NATIVE_OAUTH_REDIRECT`)
- iOS `CFBundleURLSchemes` in `ios/App/App/Info.plist`
- `callbackURLScheme` in `ios/App/ViewController 3.swift`
- Android `AndroidManifest.xml` intent-filter `android:scheme` / `host`
- Supabase redirect allowlist

## iOS native OAuth

`ASWebAuthenticationSession` is implemented in `ios/App/ViewController 3.swift` and registered via `ios/App/ASWebAuthPlugin 2.m`. The JavaScript bridge is `src/utils/asWebAuth.ts`.

## Notes

- `DEVELOPMENT_TEAM` in the Xcode project is cleared; set your Apple team in Xcode before signing.
- If `npx cap add ios` fails on a machine without CocoaPods, the iOS folder was bootstrapped from a Capacitor template and synced; open `ios/App/App.xcodeproj` in Xcode.

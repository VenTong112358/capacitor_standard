# Capacitor Standard

Blank Vite + React + Capacitor 7 + Supabase Auth scaffold (web, iOS, Android) with email/password, Google OAuth, and Apple OAuth (iOS). UI pattern mirrors [DemoLingoMock](../DemoLingoMock/).

## Prerequisites

- Node.js 18+
- For **Android**: Android Studio, JDK 17+
- For **iOS**: Xcode, CocoaPods (optional if you use SPM-only projects like this template)

## Supabase project

This repo is wired to project [`fsyodqwwbtwfkpaxdsst`](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst). Local config lives in `.env.local` (gitignored): set **`VITE_SUPABASE_ANON_KEY`** from [Project Settings → API](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst/settings/api) (anon **public** key).

## Setup

1. Copy `.env.example` to `.env.local` if needed, then set **`VITE_SUPABASE_ANON_KEY`** (URL is already `https://fsyodqwwbtwfkpaxdsst.supabase.co`).

2. In the Supabase dashboard, configure **Authentication → URL Configuration → Redirect URLs**:

   - `http://localhost:3000`
   - `com.capacitor.standard://oauth-callback`

3. Enable **Google** and **Apple** under Authentication → Providers.

### Debug Google Sign-In

1. [Authentication → Providers → Google](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst/auth/providers): turn on Google and add **Client ID** / **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client ID, type **Web application**).

2. In Google Cloud Console, under that OAuth client, set **Authorized redirect URIs** to exactly:

   `https://fsyodqwwbtwfkpaxdsst.supabase.co/auth/v1/callback`

3. Add **Authorized JavaScript origins** at least: `http://localhost:3000` (Vite dev).

4. In Supabase **Authentication → URL Configuration** (see Setup step 2), keep **Redirect URLs** including `http://localhost:3000` and `com.capacitor.standard://oauth-callback` (Google Cloud only needs the `…/auth/v1/callback` URI above).

5. Install and run the web app:

   ```bash
   npm install
   npm run dev
   ```

6. Build and sync native projects:

   ```bash
   npm run build:mobile
   ```

   Or `npm run build` then `npx cap sync`.

7. Open native IDEs:

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

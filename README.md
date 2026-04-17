# Capacitor Standard

Blank Vite + React + Capacitor 7 + Supabase Auth scaffold (web, iOS, Android) with email/password, Google OAuth, Apple OAuth (iOS), and an optional RevenueCat billing layer. This template keeps UI minimal while separating app orchestration, feature logic, and shared platform adapters.

## Project structure

```text
src/
  app/                              # App entry and high-level state composition
  features/
    auth/
      constants/                    # password rules and auth constants
      hooks/                        # auth session lifecycle hook
      services/                     # email auth + OAuth flows + callback parser
      views/                        # Auth and recovery screens
    billing/
      hooks/                        # paywall orchestration and action handlers
      services/                     # scaffold-specific membership integration
      types/                        # generic membership contract for the scaffold
      views/                        # minimal paywall UI
    home/views/                     # signed-in placeholder screen
  shared/
    config/                         # app id/name and redirect constants
    lib/                            # Supabase client + reusable RevenueCat core
    platform/                       # Capacitor bridge adapters
```

Auth business logic is intentionally kept out of React view components:

- `views/*` only renders UI and forwards user events.
- `hooks/useAuthViewModel.ts` and `hooks/useRecoveryPasswordViewModel.ts` own all state transitions.
- `services/*` contains pure validation + Supabase/OAuth integrations.

The billing layer follows the same split:

- `src/shared/lib/revenuecat-subscription/*` is a UI-free, app-agnostic RevenueCat core copied and generalized from `DemoLingoMock`.
- `src/features/billing/services/billingService.ts` is the scaffold adapter that binds RevenueCat to Supabase auth and optional backend membership functions.
- `src/features/billing/views/BillingView.tsx` is only an example paywall consumer.

## Prerequisites

- Node.js 18+
- For **Android**: Android Studio, JDK 17+
- For **iOS**: Xcode, CocoaPods (optional if you use SPM-only projects like this template)

## Supabase project

This repo is wired to project [`fsyodqwwbtwfkpaxdsst`](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst). Local config lives in `.env.local` (gitignored): set **`VITE_SUPABASE_ANON_KEY`** from [Project Settings → API](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst/settings/api) (anon **public** key).

## Setup

1. Copy `.env.example` to `.env.local` if needed, then set **`VITE_SUPABASE_ANON_KEY`** (URL is already `https://fsyodqwwbtwfkpaxdsst.supabase.co`).

2. In the Supabase dashboard, configure **Authentication → URL Configuration → Redirect URLs**:

   - `com.capacitor.standard://oauth-callback` (**required**, this scaffold uses this by default)
   - `com.capacitor.standard://auth/callback` (**optional compatibility alias** for teams migrating from older callback path)

   Android Google sign-in in this scaffold works with the default callback
   `com.capacitor.standard://oauth-callback`. The `...://auth/callback` entry is optional and only needed
   if you intentionally migrate to that callback path.

3. Enable **Google** and **Apple** under Authentication → Providers.

## Optional RevenueCat billing

The scaffold now includes a generic RevenueCat-first subscription module extracted from `DemoLingoMock`.

### Environment variables

Set these in `.env.local` if you want native billing:

```bash
VITE_REVENUECAT_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_ENTITLEMENT_KEY=pro
```

You can use a single shared key (`VITE_REVENUECAT_API_KEY`) or override per platform.

### Optional backend membership sync

If your app needs server-owned membership state after purchase or restore, also set:

```bash
VITE_BILLING_STATUS_FUNCTION=billing-status
VITE_BILLING_SYNC_FUNCTION=billing-sync-revenuecat
```

The scaffold will call those Supabase Edge Functions through `supabase.functions.invoke(...)`.
If you leave them unset, it falls back to pure RevenueCat entitlement checks on native builds.

Expected function contract:

- `billing-status` returns `{ membership: { tier, status, productId, entitlementKey, store, expiresAt, willRenew, environment } }`
- `billing-sync-revenuecat` returns the same payload after syncing provider state

### Installed module boundaries

Core reusable files:

- `src/shared/lib/revenuecat-subscription/client.ts`
- `src/shared/lib/revenuecat-subscription/formatters.ts`
- `src/shared/lib/revenuecat-subscription/useRevenueCatSubscription.ts`

Scaffold adapter files:

- `src/features/billing/services/billingConfig.ts`
- `src/features/billing/services/billingService.ts`
- `src/features/billing/hooks/useBillingViewModel.ts`
- `src/features/billing/views/BillingView.tsx`

### Native sync

After changing billing dependencies or env, rebuild and sync native projects:

```bash
npm install
npm run build:mobile
```

If you only need to refresh native bindings after editing code:

```bash
npx cap sync
```

### Debug Google Sign-In

1. [Authentication → Providers → Google](https://supabase.com/dashboard/project/fsyodqwwbtwfkpaxdsst/auth/providers): turn on Google and add **Client ID** / **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client ID, type **Web application**).

2. In Google Cloud Console, under that OAuth client, set **Authorized redirect URIs** to exactly:

   `https://fsyodqwwbtwfkpaxdsst.supabase.co/auth/v1/callback`

3. In Supabase **Authentication → URL Configuration** (see Setup step 2), keep **Redirect URLs** including `com.capacitor.standard://oauth-callback` (Google Cloud only needs the `…/auth/v1/callback` URI above).

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

### iOS Google login unexpectedly returns to `localhost`

If Google login on iOS jumps to `http://localhost` instead of returning to the app, Supabase is usually falling back to its **Site URL** because the native deep-link redirect is not accepted.

Check these items in order:

1. Supabase **Authentication → URL Configuration → Redirect URLs** should include:

   - `com.capacitor.standard://oauth-callback` (required)
   - `com.capacitor.standard://auth/callback` (optional compatibility alias)

2. iOS URL scheme in `ios/App/App/Info.plist` must include:

   - `com.capacitor.standard`

3. Native callback constants must match the redirect path you actually use:

   - `src/shared/config/appConfig.ts` → `appId: 'com.capacitor.standard'`
   - `src/shared/config/appConfig.ts` → `NATIVE_OAUTH_REDIRECT = com.capacitor.standard://oauth-callback`
   - `ios/App/ViewController.swift` → `callbackURLScheme: "com.capacitor.standard"`
   - `android/app/src/main/AndroidManifest.xml` host must match (currently `oauth-callback`)

   If you switch the active redirect path to `com.capacitor.standard://auth/callback`, also update:

   - `src/shared/config/appConfig.ts` → `oauthCallbackHost: 'auth/callback'`
   - `android/app/src/main/AndroidManifest.xml` host to `auth`
   - Android deep-link parsing logic if you add stricter URL prefix checks

4. Rebuild and re-sync native assets after any redirect/scheme change:

   ```bash
   npm run build
   npx cap sync ios
   ```

5. Delete and reinstall the iOS app on device/simulator to avoid stale scheme/cache behavior.

## Renaming the app id

When you change `appId` in `capacitor.config.ts`, also update:

- `src/shared/config/appConfig.ts` (`appId` / `NATIVE_OAUTH_REDIRECT`)
- iOS `CFBundleURLSchemes` in `ios/App/App/Info.plist`
- `callbackURLScheme` in `ios/App/ViewController.swift`
- Android `AndroidManifest.xml` intent-filter `android:scheme` / `host`
- Supabase redirect allowlist

## iOS native OAuth

`ASWebAuthenticationSession` is implemented in `ios/App/ViewController.swift` and registered via `ios/App/ASWebAuthPlugin.m`. The JavaScript bridge is `src/shared/platform/asWebAuth.ts`.

Google / Apple callback parsing supports both implicit tokens (`access_token`) and authorization code flow (`code`) in `src/features/auth/services/oauthCallback.ts`, which fixes iOS callback compatibility issues across different Supabase OAuth response modes.

## App icon

This scaffold keeps the default Capacitor app icons on iOS and Android (no custom icon assets).

## Notes

- `DEVELOPMENT_TEAM` in the Xcode project is cleared; set your Apple team in Xcode before signing.
- If `npx cap add ios` fails on a machine without CocoaPods, the iOS folder was bootstrapped from a Capacitor template and synced; open `ios/App/App.xcodeproj` in Xcode.

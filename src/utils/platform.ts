import { Capacitor } from '@capacitor/core';

/** Must match capacitor.config.ts appId and Supabase redirect allowlist. */
export const NATIVE_OAUTH_REDIRECT = 'com.capacitor.standard://oauth-callback';

export function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_OAUTH_REDIRECT;
  }
  return window.location.origin;
}

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

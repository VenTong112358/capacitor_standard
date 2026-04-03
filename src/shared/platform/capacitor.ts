import { Capacitor } from '@capacitor/core';
import { NATIVE_OAUTH_REDIRECT } from '../config/appConfig';

export { NATIVE_OAUTH_REDIRECT };

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

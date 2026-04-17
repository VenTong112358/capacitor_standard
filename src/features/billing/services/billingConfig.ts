import { Capacitor } from '@capacitor/core';

export function getRevenueCatApiKey(): string | null {
  const sharedKey = import.meta.env.VITE_REVENUECAT_API_KEY?.trim() || null;
  const iosKey = import.meta.env.VITE_REVENUECAT_IOS_API_KEY?.trim() || null;
  const androidKey = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY?.trim() || null;
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') return iosKey || sharedKey;
  if (platform === 'android') return androidKey || sharedKey;
  return sharedKey;
}

export const REVENUECAT_ENTITLEMENT_KEY =
  import.meta.env.VITE_REVENUECAT_ENTITLEMENT_KEY?.trim() || 'pro';

export const BILLING_STATUS_FUNCTION =
  import.meta.env.VITE_BILLING_STATUS_FUNCTION?.trim() || null;

export const BILLING_SYNC_FUNCTION =
  import.meta.env.VITE_BILLING_SYNC_FUNCTION?.trim() || null;

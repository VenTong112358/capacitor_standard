import { LOG_LEVEL, type CustomerInfo } from '@revenuecat/purchases-capacitor';
import { supabase } from '../../../shared/lib/supabase';
import {
  createRevenueCatSubscriptionClient,
  type SubscriptionCatalog,
  type SubscriptionIntegration,
  type SubscriptionManagementResult,
  type SubscriptionPlan,
  type SubscriptionPurchaseResult,
  type SubscriptionRestoreResult,
  type SubscriptionSnapshot,
} from '../../../shared/lib/revenuecat-subscription';
import { BILLING_STATUS_FUNCTION, BILLING_SYNC_FUNCTION, REVENUECAT_ENTITLEMENT_KEY, getRevenueCatApiKey } from './billingConfig';
import {
  DEFAULT_BILLING_MEMBERSHIP,
  type BillingMembership,
  type BillingMembershipEnvironment,
  type BillingMembershipStatus,
  type BillingMembershipStore,
  type BillingMembershipTier,
} from '../types/membership';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asMembershipTier(value: unknown): BillingMembershipTier {
  return value === 'pro' ? 'pro' : 'free';
}

function asMembershipStatus(value: unknown): BillingMembershipStatus {
  return value === 'active' ||
    value === 'grace_period' ||
    value === 'billing_issue' ||
    value === 'expired'
    ? value
    : 'free';
}

function mapStore(value: unknown): BillingMembershipStore {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'app_store' || normalized === 'app store' || normalized === 'appstore') {
    return 'app_store';
  }
  if (normalized === 'play_store' || normalized === 'play store' || normalized === 'playstore') {
    return 'play_store';
  }
  return null;
}

function mapEnvironment(value: unknown): BillingMembershipEnvironment {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'sandbox') {
    return 'sandbox';
  }
  if (normalized === 'production') {
    return 'production';
  }
  return null;
}

function normalizeBillingMembership(value: unknown): BillingMembership {
  if (!isRecord(value)) {
    return DEFAULT_BILLING_MEMBERSHIP;
  }

  return {
    tier: asMembershipTier(value.tier),
    status: asMembershipStatus(value.status),
    productId: asNullableString(value.productId ?? value.product_id),
    entitlementKey: asNullableString(value.entitlementKey ?? value.entitlement_key),
    store: mapStore(value.store),
    expiresAt: asNullableString(value.expiresAt ?? value.expires_at),
    willRenew: asNullableBoolean(value.willRenew ?? value.will_renew),
    environment: mapEnvironment(value.environment),
  };
}

function deriveMembershipFromCustomerInfo(customerInfo: CustomerInfo): BillingMembership {
  const entitlement = customerInfo.entitlements.active?.[REVENUECAT_ENTITLEMENT_KEY] as unknown as
    | Record<string, unknown>
    | undefined;

  if (!entitlement) {
    return DEFAULT_BILLING_MEMBERSHIP;
  }

  const environment = entitlement.isSandbox === true
    ? 'sandbox'
    : entitlement.isSandbox === false
      ? 'production'
      : null;

  return {
    tier: 'pro',
    status: 'active',
    productId: asNullableString(entitlement.productIdentifier),
    entitlementKey: REVENUECAT_ENTITLEMENT_KEY,
    store: mapStore(entitlement.store),
    expiresAt: asNullableString(entitlement.expirationDate),
    willRenew: asNullableBoolean(entitlement.willRenew),
    environment,
  };
}

async function getAuthUid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function ensurePurchasesConfigured(): Promise<boolean> {
  if (!billingSubscriptionClient.isAvailable()) {
    return false;
  }

  const appUserId = await getAuthUid();
  if (!appUserId) {
    return false;
  }

  await billingSubscriptionClient.configure(appUserId);
  return true;
}

async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error) return fallback;
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const text = await context.clone().text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (isRecord(parsed) && typeof parsed.error === 'string') return parsed.error;
          if (isRecord(parsed) && typeof parsed.message === 'string') return parsed.message;
        } catch {
          // text is not JSON
        }
        return text;
      }
    } catch {
      // ignore
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function invokeMembershipFunction(functionName: string): Promise<BillingMembership> {
  const { data, error } = await supabase.functions.invoke(functionName);
  if (error) {
    const message = await extractFunctionErrorMessage(error, `Failed to invoke ${functionName}`);
    throw new Error(`${functionName}: ${message}`);
  }

  const payload = isRecord(data) ? data.membership : null;
  return normalizeBillingMembership(payload);
}

async function fetchRevenueCatMembership(): Promise<BillingMembership> {
  const isConfigured = await ensurePurchasesConfigured();
  if (!isConfigured) {
    return DEFAULT_BILLING_MEMBERSHIP;
  }

  const customerInfo = await billingSubscriptionClient.getCustomerInfo();
  return deriveMembershipFromCustomerInfo(customerInfo);
}

export const billingSubscriptionClient = createRevenueCatSubscriptionClient({
  apiKey: getRevenueCatApiKey(),
  entitlementKey: REVENUECAT_ENTITLEMENT_KEY,
  getLogLevel: () => (import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO),
});

export function canUseNativeSubscriptions(): boolean {
  return billingSubscriptionClient.isAvailable();
}

export function configurePurchases(appUserId: string): Promise<boolean> {
  return billingSubscriptionClient.configure(appUserId);
}

export function logOutPurchases(): Promise<void> {
  return billingSubscriptionClient.logOut();
}

export async function getBillingMembership(): Promise<BillingMembership> {
  if (BILLING_STATUS_FUNCTION) {
    return invokeMembershipFunction(BILLING_STATUS_FUNCTION);
  }

  if (canUseNativeSubscriptions()) {
    return fetchRevenueCatMembership();
  }

  return DEFAULT_BILLING_MEMBERSHIP;
}

export async function syncBillingMembershipFromRevenueCat(): Promise<BillingMembership> {
  if (canUseNativeSubscriptions()) {
    const isConfigured = await ensurePurchasesConfigured();
    if (isConfigured) {
      await billingSubscriptionClient.getCustomerInfo();
    }
  }

  if (BILLING_SYNC_FUNCTION) {
    try {
      return await invokeMembershipFunction(BILLING_SYNC_FUNCTION);
    } catch (error) {
      console.warn(
        'Backend billing sync failed, falling back to RevenueCat customer info:',
        error instanceof Error ? error.message : error,
      );
      if (canUseNativeSubscriptions()) {
        return fetchRevenueCatMembership();
      }
      throw error;
    }
  }

  if (canUseNativeSubscriptions()) {
    return fetchRevenueCatMembership();
  }

  return getBillingMembership();
}

export function createBillingIntegration(
  onMembershipChanged?: (membership: BillingMembership | null) => void,
): SubscriptionIntegration<BillingMembership> {
  return {
    getAppUserId: getAuthUid,
    fetchMembership: getBillingMembership,
    syncMembershipFromProvider: canUseNativeSubscriptions()
      ? syncBillingMembershipFromRevenueCat
      : undefined,
    onMembershipChanged,
  };
}

export type {
  SubscriptionCatalog,
  SubscriptionManagementResult,
  SubscriptionPlan,
  SubscriptionPurchaseResult,
  SubscriptionRestoreResult,
  SubscriptionSnapshot,
};

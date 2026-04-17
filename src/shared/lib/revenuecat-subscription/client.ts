import { Capacitor } from '@capacitor/core';
import {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  Purchases,
  type CustomerInfo,
} from '@revenuecat/purchases-capacitor';
import { findPackageByPlan, toSubscriptionCatalog } from './formatters';
import type {
  RevenueCatSubscriptionClient,
  RevenueCatSubscriptionClientOptions,
  SubscriptionPlan,
} from './types';

export function canUseRevenueCatSubscriptions(apiKey: string | null): boolean {
  return Capacitor.isNativePlatform() && Boolean(apiKey?.trim());
}

export function isRevenueCatPurchaseCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    userCancelled?: boolean | null;
  };

  return (
    candidate.userCancelled === true ||
    candidate.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export function createRevenueCatSubscriptionClient(
  options: RevenueCatSubscriptionClientOptions,
): RevenueCatSubscriptionClient {
  const apiKey = options.apiKey?.trim() || null;
  let configuredAppUserId: string | null = null;
  let configurePromise: Promise<boolean> | null = null;
  let configuringAppUserId: string | null = null;

  async function isConfigured(): Promise<boolean> {
    const { isConfigured } = await Purchases.isConfigured();
    return isConfigured;
  }

  function hasActiveEntitlement(customerInfo: CustomerInfo): boolean {
    const entitlement = customerInfo.entitlements.active?.[options.entitlementKey];
    return Boolean(entitlement?.isActive);
  }

  async function ensureConfigured(): Promise<void> {
    if (!canUseRevenueCatSubscriptions(apiKey)) {
      throw new Error('Native subscriptions are unavailable on this platform');
    }

    if (!configuredAppUserId || !(await isConfigured())) {
      throw new Error('RevenueCat must be configured before calling this function');
    }
  }

  return {
    isAvailable() {
      return canUseRevenueCatSubscriptions(apiKey);
    },

    isConfigured,

    async configure(appUserId: string): Promise<boolean> {
      const configuredApiKey = apiKey;
      if (!configuredApiKey || !canUseRevenueCatSubscriptions(configuredApiKey)) {
        return false;
      }

      if (configurePromise && configuringAppUserId === appUserId) {
        return configurePromise;
      }

      configuringAppUserId = appUserId;
      configurePromise = (async () => {
        await Purchases.setLogLevel({
          level: options.getLogLevel?.() ?? LOG_LEVEL.INFO,
        });

        const alreadyConfigured = await isConfigured();
        if (!alreadyConfigured) {
          await Purchases.configure({
            apiKey: configuredApiKey,
            appUserID: appUserId,
          });
          configuredAppUserId = appUserId;
          return true;
        }

        const { appUserID } = await Purchases.getAppUserID();
        if (appUserID !== appUserId) {
          await Purchases.logIn({ appUserID: appUserId });
        }

        configuredAppUserId = appUserId;
        return true;
      })();

      try {
        return await configurePromise;
      } catch (error) {
        if (configuredAppUserId === appUserId) {
          configuredAppUserId = null;
        }
        throw error;
      } finally {
        if (configuringAppUserId === appUserId) {
          configuringAppUserId = null;
        }
        if (configuredAppUserId !== appUserId) {
          configurePromise = null;
        }
      }
    },

    async logOut(): Promise<void> {
      if (!canUseRevenueCatSubscriptions(apiKey)) {
        configuredAppUserId = null;
        configuringAppUserId = null;
        configurePromise = null;
        return;
      }

      if (await isConfigured()) {
        await Purchases.logOut();
      }

      configuredAppUserId = null;
      configuringAppUserId = null;
      configurePromise = null;
    },

    async getCatalog() {
      if (!canUseRevenueCatSubscriptions(apiKey)) {
        return null;
      }

      await ensureConfigured();
      const offerings = await Purchases.getOfferings();
      return toSubscriptionCatalog(offerings.current);
    },

    async getCustomerInfo(): Promise<CustomerInfo> {
      await ensureConfigured();
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo;
    },

    async addCustomerInfoUpdateListener(listener) {
      if (!canUseRevenueCatSubscriptions(apiKey)) {
        return async () => {};
      }

      await ensureConfigured();
      const listenerId = await Purchases.addCustomerInfoUpdateListener(listener);

      return async () => {
        await Purchases.removeCustomerInfoUpdateListener({
          listenerToRemove: listenerId,
        }).catch(console.error);
      };
    },

    async purchasePlan(plan: SubscriptionPlan) {
      await ensureConfigured();
      const offerings = await Purchases.getOfferings();
      const aPackage = findPackageByPlan(offerings.current, plan);

      if (!aPackage) {
        throw new Error(
          'Selected subscription option is no longer available. Please reopen the paywall.',
        );
      }

      try {
        const result = await Purchases.purchasePackage({ aPackage });
        if (!hasActiveEntitlement(result.customerInfo)) {
          throw new Error('Purchase completed but the expected entitlement is not active');
        }

        return {
          status: 'purchased' as const,
          customerInfo: result.customerInfo,
        };
      } catch (error) {
        if (isRevenueCatPurchaseCancelled(error)) {
          return { status: 'cancelled' as const };
        }

        throw error;
      }
    },

    async restorePurchases() {
      await ensureConfigured();
      const { customerInfo } = await Purchases.restorePurchases();
      return { customerInfo };
    },

    async getManagementUrl() {
      if (!canUseRevenueCatSubscriptions(apiKey)) {
        return null;
      }

      await ensureConfigured();
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo.managementURL;
    },
  };
}

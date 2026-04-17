import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type {
  SubscriptionCatalog,
  SubscriptionManagementResult,
  SubscriptionPlan,
  SubscriptionPurchaseResult,
  SubscriptionRestoreResult,
  SubscriptionSnapshot,
  UseRevenueCatSubscriptionOptions,
  UseRevenueCatSubscriptionReturn,
} from './types';

function getManagementFallbackMessage(): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') {
    return 'Open Google Play > Payments & subscriptions > Subscriptions to manage or cancel.';
  }

  if (platform === 'ios') {
    return 'Open App Store account subscriptions on your iPhone to manage or cancel.';
  }

  return 'Open the store account that owns this subscription to manage or cancel it.';
}

async function openManagementUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function useRevenueCatSubscription<TMembership>({
  isAuthenticated,
  client,
  integration,
}: UseRevenueCatSubscriptionOptions<TMembership>): UseRevenueCatSubscriptionReturn<TMembership> {
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot<TMembership>>({
    membership: null,
    catalog: null,
    isLoadingMembership: false,
    isLoadingCatalog: false,
    isBusy: false,
  });
  const membershipRequestId = useRef(0);
  const catalogRequestId = useRef(0);
  const delayedRefreshTimeoutId = useRef<number | null>(null);

  const applyMembership = useCallback((membership: TMembership | null) => {
    setSnapshot((current) =>
      current.membership === membership ? current : { ...current, membership },
    );
    integration.onMembershipChanged?.(membership);
  }, [integration]);

  const updateCatalog = useCallback((catalog: SubscriptionCatalog | null) => {
    setSnapshot((current) => (current.catalog === catalog ? current : { ...current, catalog }));
  }, []);

  const setMembershipLoading = useCallback((isLoadingMembership: boolean) => {
    setSnapshot((current) =>
      current.isLoadingMembership === isLoadingMembership
        ? current
        : { ...current, isLoadingMembership },
    );
  }, []);

  const setCatalogLoading = useCallback((isLoadingCatalog: boolean) => {
    setSnapshot((current) =>
      current.isLoadingCatalog === isLoadingCatalog ? current : { ...current, isLoadingCatalog },
    );
  }, []);

  const setBusy = useCallback((isBusy: boolean) => {
    setSnapshot((current) => (current.isBusy === isBusy ? current : { ...current, isBusy }));
  }, []);

  const clearDelayedRefresh = useCallback(() => {
    if (delayedRefreshTimeoutId.current !== null) {
      globalThis.clearTimeout(delayedRefreshTimeoutId.current);
      delayedRefreshTimeoutId.current = null;
    }
  }, []);

  const ensureClientReady = useCallback(async () => {
    if (!client.isAvailable()) {
      return false;
    }

    const appUserId = await integration.getAppUserId();
    if (!appUserId) {
      throw new Error('Not authenticated');
    }

    await client.configure(appUserId);
    return true;
  }, [client, integration]);

  const loadMembership = useCallback(async (syncNative: boolean): Promise<TMembership | null> => {
    if (!isAuthenticated) {
      applyMembership(null);
      return null;
    }

    const requestId = membershipRequestId.current + 1;
    membershipRequestId.current = requestId;
    setMembershipLoading(true);

    try {
      const shouldSyncProvider = Boolean(
        syncNative && client.isAvailable() && integration.syncMembershipFromProvider,
      );

      let membership: TMembership;
      if (shouldSyncProvider) {
        try {
          await ensureClientReady();
          membership = await integration.syncMembershipFromProvider!();
        } catch (error) {
          console.error(
            'RevenueCat provider sync failed, falling back to stored membership:',
            error,
          );
          membership = await integration.fetchMembership();
        }
      } else {
        membership = await integration.fetchMembership();
      }

      if (membershipRequestId.current !== requestId) {
        return null;
      }

      applyMembership(membership);
      return membership;
    } catch (error) {
      console.error('RevenueCat membership refresh failed:', error);
      return null;
    } finally {
      if (membershipRequestId.current === requestId) {
        setMembershipLoading(false);
      }
    }
  }, [
    applyMembership,
    client,
    ensureClientReady,
    integration,
    isAuthenticated,
    setMembershipLoading,
  ]);

  const refreshMembershipAfterResume = useCallback(() => {
    clearDelayedRefresh();
    void loadMembership(true);

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    delayedRefreshTimeoutId.current = globalThis.setTimeout(() => {
      delayedRefreshTimeoutId.current = null;
      void loadMembership(true);
    }, 1500);
  }, [clearDelayedRefresh, loadMembership]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearDelayedRefresh();
      membershipRequestId.current += 1;
      catalogRequestId.current += 1;
      setSnapshot({
        membership: null,
        catalog: null,
        isLoadingMembership: false,
        isLoadingCatalog: false,
        isBusy: false,
      });
      integration.onMembershipChanged?.(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const retryDelays = Capacitor.isNativePlatform() ? [0, 1500] : [0];

      for (const delay of retryDelays) {
        if (delay > 0) {
          await wait(delay);
        }

        if (cancelled) {
          return;
        }

        await loadMembership(true);
      }
    })();

    return () => {
      cancelled = true;
      clearDelayedRefresh();
    };
  }, [
    clearDelayedRefresh,
    loadMembership,
    integration,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshMembershipAfterResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let appStateListener: { remove: () => Promise<void> } | undefined;
    let browserFinishedListener: { remove: () => Promise<void> } | undefined;
    let removeCustomerInfoListener: (() => Promise<void>) | null = null;

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          refreshMembershipAfterResume();
        }
      })
        .then((listener) => {
          appStateListener = listener;
        })
        .catch(console.error);

      Browser.addListener('browserFinished', () => {
        refreshMembershipAfterResume();
      })
        .then((listener) => {
          browserFinishedListener = listener;
        })
        .catch(console.error);

      ensureClientReady()
        .then(() => client.addCustomerInfoUpdateListener(() => {
          refreshMembershipAfterResume();
        }))
        .then((cleanup) => {
          removeCustomerInfoListener = cleanup;
        })
        .catch((error) => {
          console.error('RevenueCat customer info listener setup failed:', error);
        });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearDelayedRefresh();
      if (appStateListener) {
        void appStateListener.remove();
      }
      if (browserFinishedListener) {
        void browserFinishedListener.remove();
      }
      if (removeCustomerInfoListener) {
        void removeCustomerInfoListener();
      }
    };
  }, [
    clearDelayedRefresh,
    client,
    ensureClientReady,
    isAuthenticated,
    refreshMembershipAfterResume,
  ]);

  const refreshCatalog = useCallback(async (): Promise<SubscriptionCatalog | null> => {
    if (!client.isAvailable()) {
      updateCatalog(null);
      return null;
    }

    const requestId = catalogRequestId.current + 1;
    catalogRequestId.current = requestId;
    setCatalogLoading(true);

    try {
      await ensureClientReady();
      const catalog = await client.getCatalog();
      if (catalogRequestId.current !== requestId) {
        return null;
      }

      updateCatalog(catalog);
      return catalog;
    } catch (error) {
      console.error('RevenueCat catalog refresh failed:', error);
      if (catalogRequestId.current === requestId) {
        updateCatalog(null);
      }
      return null;
    } finally {
      if (catalogRequestId.current === requestId) {
        setCatalogLoading(false);
      }
    }
  }, [client, ensureClientReady, setCatalogLoading, updateCatalog]);

  const purchasePlan = useCallback(async (
    plan: SubscriptionPlan,
  ): Promise<SubscriptionPurchaseResult<TMembership>> => {
    setBusy(true);

    try {
      await ensureClientReady();
      const result = await client.purchasePlan(plan);
      if (result.status === 'cancelled') {
        return result;
      }

      const membership = integration.syncMembershipFromProvider
        ? await integration.syncMembershipFromProvider()
        : await integration.fetchMembership();
      applyMembership(membership);

      return {
        status: 'purchased',
        membership,
        customerInfo: result.customerInfo,
      };
    } finally {
      setBusy(false);
    }
  }, [applyMembership, client, ensureClientReady, integration, setBusy]);

  const restorePurchases = useCallback(async (): Promise<SubscriptionRestoreResult<TMembership> | null> => {
    if (!client.isAvailable()) {
      return null;
    }

    setBusy(true);

    try {
      await ensureClientReady();
      const { customerInfo } = await client.restorePurchases();
      const membership = integration.syncMembershipFromProvider
        ? await integration.syncMembershipFromProvider()
        : await integration.fetchMembership();
      applyMembership(membership);

      return {
        membership,
        customerInfo,
      };
    } finally {
      setBusy(false);
    }
  }, [applyMembership, client, ensureClientReady, integration, setBusy]);

  const manageSubscription = useCallback(async (): Promise<SubscriptionManagementResult> => {
    setBusy(true);

    try {
      await ensureClientReady();
      const managementUrl = await client.getManagementUrl();
      if (managementUrl) {
        await openManagementUrl(managementUrl);
        return {
          status: 'opened',
          url: managementUrl,
        };
      }

      return {
        status: 'unavailable',
        message: getManagementFallbackMessage(),
      };
    } finally {
      setBusy(false);
    }
  }, [client, ensureClientReady, setBusy]);

  const reset = useCallback(() => {
    clearDelayedRefresh();
    membershipRequestId.current += 1;
    catalogRequestId.current += 1;
    setSnapshot({
      membership: null,
      catalog: null,
      isLoadingMembership: false,
      isLoadingCatalog: false,
      isBusy: false,
    });
    integration.onMembershipChanged?.(null);
  }, [clearDelayedRefresh, integration]);

  return {
    snapshot,
    applyMembership,
    refreshMembership: loadMembership,
    refreshCatalog,
    purchasePlan,
    restorePurchases,
    manageSubscription,
    reset,
  };
}

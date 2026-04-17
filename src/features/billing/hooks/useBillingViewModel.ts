import { useCallback, useMemo, useState } from 'react';
import { useRevenueCatSubscription } from '../../../shared/lib/revenuecat-subscription';
import {
  billingSubscriptionClient,
  canUseNativeSubscriptions,
  createBillingIntegration,
  type SubscriptionCatalog,
  type SubscriptionPlan,
} from '../services/billingService';
import type { BillingMembership } from '../types/membership';

interface UseBillingViewModelOptions {
  isAuthenticated: boolean;
}

export function useBillingViewModel({ isAuthenticated }: UseBillingViewModelOptions) {
  const [showBillingView, setShowBillingView] = useState(false);
  const integration = useMemo(() => createBillingIntegration(), []);
  const {
    snapshot,
    refreshMembership,
    refreshCatalog,
    purchasePlan,
    restorePurchases,
    manageSubscription,
    reset,
  } = useRevenueCatSubscription<BillingMembership>({
    isAuthenticated,
    client: billingSubscriptionClient,
    integration,
  });

  const resetBillingState = useCallback(() => {
    setShowBillingView(false);
    reset();
  }, [reset]);

  const closeBillingView = useCallback(() => {
    setShowBillingView(false);
  }, []);

  const openBillingView = useCallback(() => {
    setShowBillingView(true);
    void refreshCatalog();
  }, [refreshCatalog]);

  const refreshBillingState = useCallback(async () => {
    await refreshMembership(true);
  }, [refreshMembership]);

  const handleManageSubscription = useCallback(async () => {
    try {
      const result = await manageSubscription();
      if (result.status === 'unavailable') {
        window.alert(result.message);
      }
    } catch (error: any) {
      console.error('manageSubscription error:', error);
      window.alert(error?.message || 'Unable to open subscription management right now.');
    }
  }, [manageSubscription]);

  const purchaseSelectedPlan = useCallback(async (selectedPlan: SubscriptionPlan) => {
    try {
      const result = await purchasePlan(selectedPlan);
      if (result.status === 'cancelled') {
        return;
      }

      closeBillingView();
    } catch (error: any) {
      console.error('purchasePlan error:', error);
      window.alert(error?.message || 'Purchase failed.');
    }
  }, [closeBillingView, purchasePlan]);

  const restoreBillingPurchases = useCallback(async () => {
    try {
      await restorePurchases();
      closeBillingView();
    } catch (error: any) {
      console.error('restorePurchases error:', error);
      window.alert(error?.message || 'Restore failed.');
    }
  }, [closeBillingView, restorePurchases]);

  return {
    membership: snapshot.membership,
    showBillingView,
    subscriptionCatalog: snapshot.catalog as SubscriptionCatalog | null,
    isLoading: snapshot.isLoadingCatalog || snapshot.isLoadingMembership,
    isBusy: snapshot.isBusy,
    canPurchaseNative: canUseNativeSubscriptions(),
    openBillingView,
    closeBillingView,
    refreshBillingState,
    manageSubscription: handleManageSubscription,
    purchaseSelectedPlan,
    restoreBillingPurchases,
    resetBillingState,
  };
}

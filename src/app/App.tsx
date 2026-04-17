import { AuthView } from '../features/auth/views/AuthView';
import { RecoveryPasswordView } from '../features/auth/views/RecoveryPasswordView';
import { useAuthSession } from '../features/auth/hooks/useAuthSession';
import { signOutCurrentUser } from '../features/auth/services/authService';
import { useBillingViewModel } from '../features/billing/hooks/useBillingViewModel';
import { logOutPurchases } from '../features/billing/services/billingService';
import { BillingView } from '../features/billing/views/BillingView';
import { HomeView } from '../features/home/views/HomeView';

export default function App() {
  const { isLoading, user, isRecoveryMode, reloadUser, leaveRecoveryMode } = useAuthSession();
  const billing = useBillingViewModel({ isAuthenticated: Boolean(user) });

  const handleAuthSuccess = async () => {
    await reloadUser();
  };

  const handleLogout = async () => {
    await logOutPurchases().catch(console.error);
    await signOutCurrentUser();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <p className="text-sm font-semibold text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isRecoveryMode) {
    return <RecoveryPasswordView onDone={leaveRecoveryMode} />;
  }

  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <HomeView
        user={user}
        membership={billing.membership}
        isBillingBusy={billing.isBusy}
        onOpenBilling={billing.openBillingView}
        onRefreshBilling={billing.refreshBillingState}
        onLogout={handleLogout}
      />
      {billing.showBillingView ? (
        <BillingView
          membership={billing.membership}
          catalog={billing.subscriptionCatalog}
          canPurchaseNative={billing.canPurchaseNative}
          isLoading={billing.isLoading}
          isBusy={billing.isBusy}
          onClose={billing.closeBillingView}
          onPurchase={billing.purchaseSelectedPlan}
          onManage={billing.manageSubscription}
          onRestore={billing.restoreBillingPurchases}
        />
      ) : null}
    </>
  );
}

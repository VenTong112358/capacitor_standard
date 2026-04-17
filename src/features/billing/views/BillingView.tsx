import { useEffect, useState } from 'react';
import type { SubscriptionCatalog, SubscriptionPlan } from '../services/billingService';
import type { BillingMembership } from '../types/membership';

interface BillingViewProps {
  membership: BillingMembership | null;
  catalog: SubscriptionCatalog | null;
  canPurchaseNative: boolean;
  isLoading: boolean;
  isBusy: boolean;
  onClose: () => void;
  onPurchase: (selectedPlan: SubscriptionPlan) => void;
  onManage: () => void;
  onRestore: () => void;
}

function formatStatus(status: BillingMembership['status'] | undefined) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'grace_period':
      return 'Grace period';
    case 'billing_issue':
      return 'Billing issue';
    case 'expired':
      return 'Expired';
    default:
      return 'Free';
  }
}

export function BillingView({
  membership,
  catalog,
  canPurchaseNative,
  isLoading,
  isBusy,
  onClose,
  onPurchase,
  onManage,
  onRestore,
}: BillingViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const planIdsKey = catalog?.plans.map((item) => item.planId).join('|') ?? '';

  useEffect(() => {
    setSelectedPlanId(catalog?.plans[0]?.planId ?? null);
  }, [catalog?.offeringId, planIdsKey]);

  const selectedPlan = catalog?.plans.find((item) => item.planId === selectedPlanId) ?? null;
  const isProMember = membership?.tier === 'pro';
  const hasPlans = Boolean(catalog?.plans.length);

  return (
    <div className="fixed inset-0 z-[90] bg-gray-950/55 backdrop-blur-sm overflow-y-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="purple-gradient px-6 pt-8 pb-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                  Billing
                </p>
                <h2 className="mt-2 text-3xl font-black text-white tracking-tight">
                  RevenueCat Paywall
                </h2>
                <p className="mt-3 text-sm text-white/85 leading-relaxed">
                  This scaffold keeps the payment layer generic: RevenueCat handles native purchase
                  flow, and Supabase functions can optionally provide your backend membership state.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Current plan
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {isProMember ? 'Pro' : 'Free'}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 border border-gray-200">
                  {formatStatus(membership?.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white p-3 border border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Store
                  </p>
                  <p className="mt-1 font-bold text-gray-800">
                    {membership?.store === 'app_store'
                      ? 'App Store'
                      : membership?.store === 'play_store'
                        ? 'Google Play'
                        : 'Not linked'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 border border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Renews
                  </p>
                  <p className="mt-1 font-bold text-gray-800">
                    {membership?.willRenew === null
                      ? 'Unknown'
                      : membership?.willRenew
                        ? 'Yes'
                        : 'No'}
                  </p>
                </div>
              </div>
              {membership?.expiresAt ? (
                <p className="text-xs font-semibold text-gray-500">
                  Expires: {new Date(membership.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            {!canPurchaseNative ? (
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                RevenueCat purchase actions only run inside native iOS or Android builds. You can
                still use backend membership checks on web.
              </div>
            ) : null}

            {canPurchaseNative && isLoading ? (
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4 text-sm font-semibold text-gray-600">
                Loading available plans from RevenueCat...
              </div>
            ) : null}

            {canPurchaseNative && !isLoading && !hasPlans ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                RevenueCat did not return any active packages. Check the default offering and store
                products in the RevenueCat dashboard.
              </div>
            ) : null}

            {!isProMember && hasPlans ? (
              <div className="space-y-3">
                {catalog?.plans.map((plan) => {
                  const isSelected = plan.planId === selectedPlanId;
                  return (
                    <button
                      key={plan.planId}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.planId)}
                      className={`w-full rounded-3xl border p-5 text-left transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                          : 'border-gray-100 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black">{plan.label}</p>
                          <p className="mt-2 text-2xl font-black leading-none">{plan.priceString}</p>
                          {plan.billingLabel ? (
                            <p className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                              {plan.billingLabel}
                            </p>
                          ) : null}
                          {plan.comparisonLabel ? (
                            <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.14em] ${isSelected ? 'text-white/70' : 'text-purple-600'}`}>
                              {plan.comparisonLabel}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] border ${
                            isSelected
                              ? 'border-white/20 bg-white/10 text-white'
                              : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Choose'}
                        </span>
                      </div>

                      {plan.introOfferLabel ? (
                        <p className={`mt-4 text-sm font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                          {plan.introOfferLabel}
                        </p>
                      ) : null}

                      {plan.description?.trim() ? (
                        <p className={`mt-2 text-sm ${isSelected ? 'text-white/75' : 'text-gray-600'}`}>
                          {plan.description}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-3 pt-1">
              {isProMember ? (
                <button
                  type="button"
                  onClick={onManage}
                  disabled={!canPurchaseNative || isBusy}
                  className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {isBusy ? 'Opening...' : 'Manage Subscription'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan) {
                      onPurchase(selectedPlan);
                    }
                  }}
                  disabled={!canPurchaseNative || isLoading || isBusy || !selectedPlan}
                  className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {isBusy
                    ? 'Working...'
                    : selectedPlan
                      ? `Continue with ${selectedPlan.label}`
                      : 'Select a plan'}
                </button>
              )}
              <button
                type="button"
                onClick={onRestore}
                disabled={!canPurchaseNative || isBusy}
                className="w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 font-black text-sm uppercase tracking-[0.18em] disabled:opacity-50"
              >
                Restore Purchases
              </button>
              <p className="text-xs font-medium text-center text-gray-500 leading-relaxed px-2">
                The purchase client is generic. Replace the entitlement key, backend function names,
                and membership mapping to match your product.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

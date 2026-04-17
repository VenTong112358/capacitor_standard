import type { User } from '@supabase/supabase-js';
import type { BillingMembership } from '../../billing/types/membership';
import { APP_CONFIG } from '../../../shared/config/appConfig';

interface HomeViewProps {
  user: User;
  membership: BillingMembership | null;
  isBillingBusy: boolean;
  onOpenBilling: () => void;
  onRefreshBilling: () => Promise<void>;
  onLogout: () => void;
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

function formatExpiration(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return 'No expiry';
  }

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return expiresAt;
  }

  return parsed.toLocaleString();
}

export function HomeView({
  user,
  membership,
  isBillingBusy,
  onOpenBilling,
  onRefreshBilling,
  onLogout,
}: HomeViewProps) {
  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <div className="purple-gradient px-6 pt-14 pb-16 rounded-b-[48px] shadow-lg">
        <h1 className="text-2xl font-black text-white tracking-tight">{APP_CONFIG.appName}</h1>
        <p className="text-xs font-semibold text-white/80 mt-1">Signed in</p>
      </div>
      <div className="flex-1 px-6 -mt-8 pb-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
            <p className="text-sm font-bold text-gray-900 break-all">{user.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User id</p>
            <p className="text-xs font-mono text-gray-700 break-all">{user.id}</p>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Billing
              </p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {membership?.tier === 'pro' ? 'Pro plan' : 'Free plan'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBilling}
              className="rounded-2xl bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white"
            >
              Open Paywall
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatStatus(membership?.status)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Store</p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {membership?.store === 'app_store'
                  ? 'App Store'
                  : membership?.store === 'play_store'
                    ? 'Google Play'
                    : 'Not linked'}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Product
              </p>
              <p className="mt-1 text-xs font-bold text-gray-900 break-all">
                {membership?.productId ?? 'No entitlement yet'}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Expires
              </p>
              <p className="mt-1 text-xs font-bold text-gray-900">
                {formatExpiration(membership?.expiresAt)}
              </p>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            Purchases run through RevenueCat on native iOS/Android builds. If you also wire the
            optional Supabase functions, this scaffold can refresh backend membership state after
            purchase and restore flows.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                void onRefreshBilling();
              }}
              disabled={isBillingBusy}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm active:scale-[0.98] transition text-sm disabled:opacity-50"
            >
              {isBillingBusy ? 'Refreshing...' : 'Refresh membership'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-2xl shadow-md active:scale-[0.98] transition text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

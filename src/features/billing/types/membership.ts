export type BillingMembershipTier = 'free' | 'pro';
export type BillingMembershipStatus =
  | 'free'
  | 'active'
  | 'grace_period'
  | 'billing_issue'
  | 'expired';
export type BillingMembershipStore = 'app_store' | 'play_store' | null;
export type BillingMembershipEnvironment = 'sandbox' | 'production' | null;

export interface BillingMembership {
  tier: BillingMembershipTier;
  status: BillingMembershipStatus;
  productId: string | null;
  entitlementKey: string | null;
  store: BillingMembershipStore;
  expiresAt: string | null;
  willRenew: boolean | null;
  environment: BillingMembershipEnvironment;
}

export const DEFAULT_BILLING_MEMBERSHIP: BillingMembership = {
  tier: 'free',
  status: 'free',
  productId: null,
  entitlementKey: null,
  store: null,
  expiresAt: null,
  willRenew: null,
  environment: null,
};

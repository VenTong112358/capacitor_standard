import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const DEFAULT_ENTITLEMENT_KEY =
  Deno.env.get('REVENUECAT_ENTITLEMENT_KEY')?.trim() || 'pro';

export type MembershipTier = 'free' | 'pro';
export type MembershipStatus =
  | 'free'
  | 'active'
  | 'grace_period'
  | 'billing_issue'
  | 'expired';
export type MembershipProvider = 'revenuecat' | null;
export type MembershipStore = 'app_store' | 'play_store' | null;
export type MembershipEnvironment = 'sandbox' | 'production' | null;

export interface MembershipState {
  tier: MembershipTier;
  status: MembershipStatus;
  provider: MembershipProvider;
  store: MembershipStore;
  productId: string | null;
  entitlementKey: string | null;
  expiresAt: string | null;
  willRenew: boolean | null;
  environment: MembershipEnvironment;
}

export const DEFAULT_MEMBERSHIP_STATE: MembershipState = {
  tier: 'free',
  status: 'free',
  provider: null,
  store: null,
  productId: null,
  entitlementKey: null,
  expiresAt: null,
  willRenew: null,
  environment: null,
};

interface RevenueCatListResponse<T> {
  items: T[];
}

interface RevenueCatEntitlementRef {
  id: string;
  lookup_key?: string | null;
}

interface RevenueCatSubscription {
  id: string;
  product_id?: string | null;
  store?: string | null;
  environment?: string | null;
  current_period_ends_at?: string | null;
  ends_at?: string | null;
  starts_at?: string | null;
  auto_renewal_status?: string | null;
  pending_payment?: boolean | null;
  gives_access?: boolean | null;
  entitlements?: { items?: RevenueCatEntitlementRef[] } | null;
}

function getRevenueCatCredentials() {
  const projectId = Deno.env.get('REVENUECAT_PROJECT_ID')?.trim() ?? '';
  const secretKey = Deno.env.get('REVENUECAT_SECRET_KEY')?.trim() ?? '';

  if (!projectId || !secretKey) {
    throw new Error('RevenueCat is not configured');
  }

  return { projectId, secretKey };
}

function mapStore(store: string | null | undefined): MembershipStore {
  switch ((store || '').toLowerCase()) {
    case 'app_store':
      return 'app_store';
    case 'play_store':
      return 'play_store';
    default:
      return null;
  }
}

function mapEnvironment(environment: string | null | undefined): MembershipEnvironment {
  switch ((environment || '').toLowerCase()) {
    case 'sandbox':
      return 'sandbox';
    case 'production':
      return 'production';
    default:
      return null;
  }
}

function isoOrNull(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function subscriptionSortValue(subscription: RevenueCatSubscription): number {
  const candidate =
    subscription.current_period_ends_at ||
    subscription.ends_at ||
    subscription.starts_at ||
    null;
  if (!candidate) return 0;
  const parsed = new Date(candidate).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesEntitlement(subscription: RevenueCatSubscription, entitlementKey: string): boolean {
  const entitlements = subscription.entitlements?.items ?? [];
  return entitlements.some(
    (item) => item.lookup_key === entitlementKey || item.id === entitlementKey,
  );
}

function deriveMembershipStatus(subscription: RevenueCatSubscription): MembershipStatus {
  if (subscription.gives_access) {
    if (subscription.pending_payment) {
      return subscription.auto_renewal_status === 'will_renew' ? 'grace_period' : 'billing_issue';
    }
    return 'active';
  }
  return 'expired';
}

async function fetchRevenueCatSubscriptions(
  authUserId: string,
): Promise<RevenueCatSubscription[]> {
  const { projectId, secretKey } = getRevenueCatCredentials();
  const encodedCustomerId = encodeURIComponent(authUserId);
  const url =
    `https://api.revenuecat.com/v2/projects/${projectId}/customers/${encodedCustomerId}/subscriptions?limit=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) return [];
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(
      `[billing] RevenueCat v2 subscriptions fetch failed: status=${response.status} body=${errorText}`,
    );
    throw new Error(
      `RevenueCat subscriptions fetch failed: ${response.status} ${errorText || response.statusText}`,
    );
  }

  const payload = (await response.json()) as RevenueCatListResponse<RevenueCatSubscription>;
  return payload.items ?? [];
}

function buildProfileUpdate(
  subscription: RevenueCatSubscription | null,
  entitlementKey: string,
) {
  if (!subscription) {
    return {
      tier: 'free' as MembershipTier,
      status: 'free' as MembershipStatus,
      provider: null,
      store: null,
      product_id: null,
      entitlement_key: entitlementKey,
      expires_at: null,
      will_renew: null,
      environment: null,
      raw_payload: { subscriptions: [] },
      last_synced_at: new Date().toISOString(),
    };
  }

  const status = deriveMembershipStatus(subscription);
  const hasUnlimitedAccess =
    status === 'active' || status === 'grace_period' || status === 'billing_issue';

  return {
    tier: (hasUnlimitedAccess ? 'pro' : 'free') as MembershipTier,
    status,
    provider: 'revenuecat' as const,
    store: mapStore(subscription.store),
    product_id: subscription.product_id ?? subscription.id ?? null,
    entitlement_key: entitlementKey,
    expires_at: isoOrNull(subscription.current_period_ends_at ?? subscription.ends_at),
    will_renew:
      subscription.auto_renewal_status === 'will_renew' ||
      Boolean(subscription.gives_access && !subscription.ends_at),
    environment: mapEnvironment(subscription.environment),
    raw_payload: subscription,
    last_synced_at: new Date().toISOString(),
  };
}

function mapMembershipState(row: Record<string, unknown> | null): MembershipState {
  if (!row) return { ...DEFAULT_MEMBERSHIP_STATE };
  return {
    tier: (row.tier as MembershipTier) || 'free',
    status: (row.status as MembershipStatus) || 'free',
    provider: (row.provider as MembershipProvider) ?? null,
    store: (row.store as MembershipStore) ?? null,
    productId: row.product_id ? String(row.product_id) : null,
    entitlementKey: row.entitlement_key ? String(row.entitlement_key) : null,
    expiresAt: isoOrNull(row.expires_at),
    willRenew: typeof row.will_renew === 'boolean' ? row.will_renew : null,
    environment: (row.environment as MembershipEnvironment) ?? null,
  };
}

export async function getMembershipState(
  serviceClient: SupabaseClient,
  authUserId: string,
): Promise<MembershipState> {
  const { data, error } = await serviceClient
    .from('membership_profiles')
    .select(
      'tier,status,provider,store,product_id,entitlement_key,expires_at,will_renew,environment',
    )
    .eq('user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch membership state: ${error.message}`);
  }

  return mapMembershipState(data as Record<string, unknown> | null);
}

export async function syncMembershipFromRevenueCat(
  serviceClient: SupabaseClient,
  authUserId: string,
  entitlementKey: string = DEFAULT_ENTITLEMENT_KEY,
): Promise<MembershipState> {
  const subscriptions = await fetchRevenueCatSubscriptions(authUserId);
  const matchingSubscriptions = subscriptions
    .filter((subscription) => matchesEntitlement(subscription, entitlementKey))
    .sort((a, b) => subscriptionSortValue(b) - subscriptionSortValue(a));

  const bestSubscription =
    matchingSubscriptions.find((subscription) => subscription.gives_access) ??
    matchingSubscriptions[0] ??
    null;

  const update = buildProfileUpdate(bestSubscription, entitlementKey);

  const { error } = await serviceClient
    .from('membership_profiles')
    .upsert({ user_id: authUserId, ...update });

  if (error) {
    throw new Error(`Failed to sync membership profile: ${error.message}`);
  }

  return getMembershipState(serviceClient, authUserId);
}

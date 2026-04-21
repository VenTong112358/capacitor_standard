import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getPublicUserIdForAuthId } from './supabase.ts';

export const FREE_SCENARIO_GENERATION_COST = 100;
export const ROLEPLAY_TURN_LIMIT = 100;
export const DEFAULT_ENTITLEMENT_KEY = Deno.env.get('REVENUECAT_ENTITLEMENT_KEY') || 'pro';

export type MembershipTier = 'free' | 'pro';
export type MembershipStatus = 'free' | 'active' | 'grace_period' | 'billing_issue' | 'expired';
export type MembershipStore = 'app_store' | 'play_store' | null;
export type MembershipEnvironment = 'sandbox' | 'production' | null;

export interface MembershipState {
  tier: MembershipTier;
  status: MembershipStatus;
  coinsBalance: number | null;
  scenarioGenerationCost: number | null;
  remainingScenarioGenerations: number | null;
  canGenerateScenario: boolean;
  roleplayTurnLimit: number;
  store: MembershipStore;
  expiresAt: string | null;
  entitlementKey: string | null;
  willRenew: boolean | null;
  environment: MembershipEnvironment;
}

export interface MembershipDecision extends MembershipState {
  allowed: boolean;
  code: 'INSUFFICIENT_SCENARIO_COINS' | null;
}

interface GeneratedScenarioPayload {
  mainScenario: string;
  subScenario: string;
  template: Record<string, unknown>;
}

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
  entitlements?: {
    items?: RevenueCatEntitlementRef[];
  } | null;
}

function getRevenueCatCredentials() {
  const projectId = Deno.env.get('REVENUECAT_PROJECT_ID') ?? '';
  const secretKey = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';

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

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
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
  return entitlements.some((item) => item.lookup_key === entitlementKey || item.id === entitlementKey);
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

async function fetchRevenueCatSubscriptions(authUserId: string): Promise<RevenueCatSubscription[]> {
  const { projectId, secretKey } = getRevenueCatCredentials();
  const encodedCustomerId = encodeURIComponent(authUserId);
  const url = `https://api.revenuecat.com/v2/projects/${projectId}/customers/${encodedCustomerId}/subscriptions?limit=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RevenueCat subscriptions fetch failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json() as RevenueCatListResponse<RevenueCatSubscription>;
  return payload.items ?? [];
}

function buildProfileUpdate(subscription: RevenueCatSubscription | null, entitlementKey: string) {
  if (!subscription) {
    return {
      tier: 'free',
      status: 'free',
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
  const hasUnlimitedAccess = status === 'active' || status === 'grace_period' || status === 'billing_issue';

  return {
    tier: hasUnlimitedAccess ? 'pro' : 'free',
    status,
    provider: 'revenuecat',
    store: mapStore(subscription.store),
    product_id: subscription.product_id ?? subscription.id ?? null,
    entitlement_key: entitlementKey,
    expires_at: isoOrNull(subscription.current_period_ends_at ?? subscription.ends_at),
    will_renew: subscription.auto_renewal_status === 'will_renew' || Boolean(subscription.gives_access && !subscription.ends_at),
    environment: mapEnvironment(subscription.environment),
    raw_payload: subscription,
    last_synced_at: new Date().toISOString(),
  };
}

function mapMembershipState(row: Record<string, unknown>): MembershipState {
  return {
    tier: (row.tier as MembershipTier) || 'free',
    status: (row.status as MembershipStatus) || 'free',
    coinsBalance: typeof row.coins_balance === 'number' ? row.coins_balance : null,
    scenarioGenerationCost: typeof row.scenario_generation_cost === 'number' ? row.scenario_generation_cost : null,
    remainingScenarioGenerations: typeof row.remaining_scenario_generations === 'number'
      ? row.remaining_scenario_generations
      : null,
    canGenerateScenario: Boolean(row.can_generate_scenario),
    roleplayTurnLimit: typeof row.roleplay_turn_limit === 'number' ? row.roleplay_turn_limit : ROLEPLAY_TURN_LIMIT,
    store: (row.store as MembershipStore) ?? null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    entitlementKey: row.entitlement_key ? String(row.entitlement_key) : null,
    willRenew: typeof row.will_renew === 'boolean' ? row.will_renew : null,
    environment: (row.environment as MembershipEnvironment) ?? null,
  };
}

export async function getMembershipState(
  serviceClient: SupabaseClient,
  publicUserId: string,
): Promise<MembershipState> {
  const { data, error } = await serviceClient.rpc('get_membership_state', {
    p_user_id: publicUserId,
  });

  if (error) {
    throw new Error(`Failed to fetch membership state: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Membership state is unavailable');
  }

  return mapMembershipState(row);
}

export async function finalizeScenarioGeneration(
  serviceClient: SupabaseClient,
  publicUserId: string,
  scenario: GeneratedScenarioPayload,
): Promise<MembershipDecision> {
  const { data, error } = await serviceClient.rpc('finalize_scenario_generation', {
    p_user_id: publicUserId,
    p_main_scenario: scenario.mainScenario,
    p_sub_scenario: scenario.subScenario,
    p_template: scenario.template,
  });

  if (error) {
    throw new Error(`Failed to finalize scenario generation: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Membership decision is unavailable');
  }

  return {
    allowed: Boolean(row.allowed),
    code: (row.code as MembershipDecision['code']) ?? null,
    ...mapMembershipState(row),
  };
}

export async function syncMembershipFromRevenueCat(
  serviceClient: SupabaseClient,
  authUserId: string,
  entitlementKey: string = DEFAULT_ENTITLEMENT_KEY,
): Promise<MembershipState> {
  const publicUserId = await getPublicUserIdForAuthId(serviceClient, authUserId);
  if (!publicUserId) {
    throw new Error('Public user profile not found');
  }

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
    .upsert({
      user_id: publicUserId,
      ...update,
    });

  if (error) {
    throw new Error(`Failed to sync membership profile: ${error.message}`);
  }

  return getMembershipState(serviceClient, publicUserId);
}

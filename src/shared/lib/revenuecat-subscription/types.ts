import type {
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
} from '@revenuecat/purchases-capacitor';

export interface SubscriptionPlan {
  planId: string;
  productId: string;
  packageType: PACKAGE_TYPE;
  label: string;
  title: string;
  description: string;
  priceString: string;
  billingLabel: string | null;
  comparisonLabel: string | null;
  introOfferLabel: string | null;
}

export interface SubscriptionCatalog {
  offeringId: string;
  description: string;
  plans: SubscriptionPlan[];
}

export interface SubscriptionSnapshot<TMembership> {
  membership: TMembership | null;
  catalog: SubscriptionCatalog | null;
  isLoadingMembership: boolean;
  isLoadingCatalog: boolean;
  isBusy: boolean;
}

export interface SubscriptionIntegration<TMembership> {
  getAppUserId(): Promise<string | null>;
  fetchMembership(): Promise<TMembership>;
  syncMembershipFromProvider?(): Promise<TMembership>;
  onMembershipChanged?(membership: TMembership | null): void;
}

export interface RevenueCatSubscriptionClientOptions {
  apiKey: string | null;
  entitlementKey: string;
  getLogLevel?(): LOG_LEVEL;
}

export interface RevenueCatSubscriptionClient {
  isAvailable(): boolean;
  isConfigured(): Promise<boolean>;
  configure(appUserId: string): Promise<boolean>;
  logOut(): Promise<void>;
  getCatalog(): Promise<SubscriptionCatalog | null>;
  getCustomerInfo(): Promise<CustomerInfo>;
  addCustomerInfoUpdateListener(
    listener: (customerInfo: CustomerInfo) => void,
  ): Promise<() => Promise<void>>;
  purchasePlan(
    plan: SubscriptionPlan,
  ): Promise<{ status: 'purchased'; customerInfo: CustomerInfo } | { status: 'cancelled' }>;
  restorePurchases(): Promise<{ customerInfo: CustomerInfo }>;
  getManagementUrl(): Promise<string | null>;
}

export interface SubscriptionPurchaseSuccess<TMembership> {
  status: 'purchased';
  membership: TMembership;
  customerInfo: CustomerInfo;
}

export interface SubscriptionPurchaseCancelled {
  status: 'cancelled';
}

export type SubscriptionPurchaseResult<TMembership> =
  | SubscriptionPurchaseSuccess<TMembership>
  | SubscriptionPurchaseCancelled;

export interface SubscriptionRestoreResult<TMembership> {
  membership: TMembership;
  customerInfo: CustomerInfo;
}

export interface SubscriptionManagementOpenedResult {
  status: 'opened';
  url: string;
}

export interface SubscriptionManagementUnavailableResult {
  status: 'unavailable';
  message: string;
}

export type SubscriptionManagementResult =
  | SubscriptionManagementOpenedResult
  | SubscriptionManagementUnavailableResult;

export interface UseRevenueCatSubscriptionOptions<TMembership> {
  isAuthenticated: boolean;
  client: RevenueCatSubscriptionClient;
  integration: SubscriptionIntegration<TMembership>;
}

export interface UseRevenueCatSubscriptionReturn<TMembership> {
  snapshot: SubscriptionSnapshot<TMembership>;
  applyMembership(membership: TMembership | null): void;
  refreshMembership(syncNative?: boolean): Promise<TMembership | null>;
  refreshCatalog(): Promise<SubscriptionCatalog | null>;
  purchasePlan(plan: SubscriptionPlan): Promise<SubscriptionPurchaseResult<TMembership>>;
  restorePurchases(): Promise<SubscriptionRestoreResult<TMembership> | null>;
  manageSubscription(): Promise<SubscriptionManagementResult>;
  reset(): void;
}

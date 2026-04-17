import type {
  PurchasesOffering,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import type { SubscriptionCatalog, SubscriptionPlan } from './types';

const PACKAGE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual',
  SIX_MONTH: '6 months',
  THREE_MONTH: '3 months',
  TWO_MONTH: '2 months',
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  LIFETIME: 'Lifetime',
};

function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

function parseIsoPeriod(period: string | null): { unit: string; count: number } | null {
  if (!period) {
    return null;
  }

  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/i.exec(period);
  if (!match) {
    return null;
  }

  const [, years, months, weeks, days] = match;
  if (years) return { count: Number(years), unit: 'year' };
  if (months) return { count: Number(months), unit: 'month' };
  if (weeks) return { count: Number(weeks), unit: 'week' };
  if (days) return { count: Number(days), unit: 'day' };
  return null;
}

function formatBillingPeriod(period: string | null): string | null {
  const parsed = parseIsoPeriod(period);
  if (!parsed) {
    return null;
  }

  return pluralize(parsed.count, parsed.unit);
}

function formatBillingLabel(aPackage: PurchasesPackage): string | null {
  const billingPeriod = formatBillingPeriod(aPackage.product.subscriptionPeriod);
  if (!billingPeriod) {
    return null;
  }

  return `Billed every ${billingPeriod}`;
}

function formatComparisonLabel(aPackage: PurchasesPackage): string | null {
  if (aPackage.packageType !== 'MONTHLY' && aPackage.product.pricePerMonthString) {
    return `${aPackage.product.pricePerMonthString} / month equivalent`;
  }

  if (aPackage.packageType !== 'ANNUAL' && aPackage.product.pricePerYearString) {
    return `${aPackage.product.pricePerYearString} / year equivalent`;
  }

  return null;
}

function formatIntroOfferLabel(aPackage: PurchasesPackage): string | null {
  const introPrice = aPackage.product.introPrice;
  if (!introPrice) {
    return null;
  }

  const parsed = parseIsoPeriod(introPrice.period);
  if (!parsed) {
    return introPrice.price === 0
      ? 'Free trial available'
      : `Intro offer: ${introPrice.priceString}`;
  }

  const totalCount = parsed.count * Math.max(introPrice.cycles, 1);
  const durationLabel = pluralize(totalCount, parsed.unit);

  if (introPrice.price === 0) {
    return `${durationLabel} free trial`;
  }

  return `${introPrice.priceString} for ${durationLabel}`;
}

export function toSubscriptionPlan(aPackage: PurchasesPackage): SubscriptionPlan {
  return {
    planId: aPackage.identifier,
    productId: aPackage.product.identifier,
    packageType: aPackage.packageType,
    label: PACKAGE_LABELS[aPackage.packageType] || aPackage.product.title,
    title: aPackage.product.title,
    description: aPackage.product.description,
    priceString: aPackage.product.priceString,
    billingLabel: formatBillingLabel(aPackage),
    comparisonLabel: formatComparisonLabel(aPackage),
    introOfferLabel: formatIntroOfferLabel(aPackage),
  };
}

export function toSubscriptionCatalog(
  offering: PurchasesOffering | null | undefined,
): SubscriptionCatalog | null {
  if (!offering) {
    return null;
  }

  return {
    offeringId: offering.identifier,
    description: offering.serverDescription,
    plans: offering.availablePackages.map(toSubscriptionPlan),
  };
}

export function findPackageByPlan(
  offering: PurchasesOffering | null | undefined,
  plan: SubscriptionPlan,
): PurchasesPackage | null {
  if (!offering) {
    return null;
  }

  return (
    offering.availablePackages.find(
      (aPackage) =>
        aPackage.identifier === plan.planId || aPackage.product.identifier === plan.productId,
    ) ?? null
  );
}

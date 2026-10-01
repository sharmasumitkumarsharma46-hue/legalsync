export type PlanKey = 'solo' | 'small_firm' | 'mid_firm' | 'enterprise';

export type PlanFeature =
  | 'clioSync'
  | 'calendarSync'
  | 'deadlineReminders'
  | 'teamDashboard'
  | 'collaborativeCalendarSync'
  | 'prioritySupport'
  | 'roleBasedAccess'
  | 'advancedAdminControls'
  | 'highVolumeSync'
  | 'premiumSupport';

export interface PlanConfig {
  name: string;
  price: number;
  maxUsers: number;
  features: PlanFeature[];
}

const FULL_FEATURE_SET: PlanFeature[] = [
  'clioSync',
  'calendarSync',
  'deadlineReminders',
  'teamDashboard',
  'collaborativeCalendarSync',
  'prioritySupport',
  'roleBasedAccess',
  'advancedAdminControls',
  'highVolumeSync',
  'premiumSupport',
];

export const PLAN_DEFINITIONS: Record<PlanKey, PlanConfig> = {
  solo: {
    name: 'Solo',
    price: 79,
    maxUsers: 1,
    features: FULL_FEATURE_SET,
  },
  small_firm: {
    name: 'Small Firm',
    price: 199,
    maxUsers: 10,
    features: FULL_FEATURE_SET,
  },
  mid_firm: {
    name: 'Mid Firm',
    price: 499,
    maxUsers: 50,
    features: FULL_FEATURE_SET,
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    maxUsers: 200,
    features: FULL_FEATURE_SET,
  },
};

export function getPlanConfig(plan?: string | null): PlanConfig {
  if (!plan || !(plan in PLAN_DEFINITIONS)) {
    return { name: 'Unknown', price: 0, maxUsers: 0, features: [] };
  }

  return PLAN_DEFINITIONS[plan as PlanKey];
}

export function getPlanFeatures(plan?: string | null): PlanFeature[] {
  return getPlanConfig(plan).features;
}

export function hasFeatureAccess(plan: string | null | undefined, feature: string): boolean {
  if (!plan || !feature) {
    return false;
  }

  return getPlanFeatures(plan).includes(feature as PlanFeature);
}

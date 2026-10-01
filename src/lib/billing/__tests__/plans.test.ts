import { getPlanConfig, hasFeatureAccess, getPlanFeatures } from '../plans';

describe('plan access control', () => {
  it('grants the full feature set to every paid plan', () => {
    expect(getPlanConfig('solo').maxUsers).toBe(1);
    expect(hasFeatureAccess('solo', 'teamDashboard')).toBe(true);
    expect(hasFeatureAccess('solo', 'deadlineReminders')).toBe(true);
    expect(hasFeatureAccess('solo', 'roleBasedAccess')).toBe(true);
    expect(getPlanFeatures('solo')).toContain('advancedAdminControls');
  });

  it('keeps small and mid firm plans aligned with the same feature access', () => {
    expect(getPlanConfig('small_firm').maxUsers).toBe(10);
    expect(hasFeatureAccess('small_firm', 'teamDashboard')).toBe(true);
    expect(hasFeatureAccess('mid_firm', 'roleBasedAccess')).toBe(true);
    expect(getPlanFeatures('mid_firm')).toContain('premiumSupport');
  });

  it('blocks unsupported features for invalid or unknown plans', () => {
    expect(hasFeatureAccess('unknown_plan' as any, 'teamDashboard')).toBe(false);
    expect(getPlanConfig('unknown_plan' as any)).toEqual({
      name: 'Unknown',
      price: 0,
      maxUsers: 0,
      features: [],
    });
  });
});

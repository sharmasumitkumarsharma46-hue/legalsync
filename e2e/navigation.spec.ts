import { test, expect } from '@playwright/test';

/**
 * Auth is enforced in src/proxy.ts using the httpOnly session cookie, so these
 * tests assert real behaviour instead of seeding a token in localStorage.
 */
test.describe('Public pages', () => {
  test('landing page loads with product messaging', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/LegalSync/);
    await expect(page.locator('text=Clio').first()).toBeVisible();
  });

  test('help centre and legal pages are reachable', async ({ page }) => {
    await page.goto('/help-centre');
    await expect(page.locator('text=How can we help?')).toBeVisible();

    await page.goto('/privacy-policy');
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });
});

test.describe('Session guards', () => {
  test('dashboard redirects an anonymous visitor to sign in', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('onboarding redirects an anonymous visitor to sign in', async ({ page }) => {
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/login/);
  });

  test('sign in page carries the intended destination', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });
});

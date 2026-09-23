import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if page loads
    await expect(page).toHaveTitle(/LegalSync/);
  });

  test('should display navigation sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for sidebar elements
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Integrations')).toBeVisible();
  });

  test('should display connection status cards', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for connection cards
    await expect(page.locator('text=Clio')).toBeVisible();
    await expect(page.locator('text=Google Calendar')).toBeVisible();
    await expect(page.locator('text=Outlook')).toBeVisible();
  });

  test('should display sync history table', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for sync history table
    await expect(page.locator('text=Sync History')).toBeVisible();
  });
});

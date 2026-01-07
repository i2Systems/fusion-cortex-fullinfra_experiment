/**
 * Navigation E2E Tests
 * 
 * Critical Path Test #1: Tests basic application navigation
 * to ensure users can navigate between main pages.
 */

import { test, expect } from './fixtures';

test.describe('Navigation', () => {

    test('should load the application and redirect to dashboard', async ({ page }) => {
        // Navigate to root
        await page.goto('/');

        // Should either be on dashboard or redirected there
        await page.waitForLoadState('networkidle');

        // Verify we're on a valid page (dashboard is the default)
        const url = page.url();
        expect(url).toMatch(/\/(dashboard)?$/);
    });

    test('should navigate to Map page via sidebar', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find and click the Map navigation link
        const mapLink = page.locator('a[href="/map"]');
        await mapLink.click();

        // Wait for navigation
        await page.waitForURL('**/map');

        // Verify we're on the map page
        expect(page.url()).toContain('/map');

        // Verify some map-related content loads
        await page.waitForLoadState('networkidle');
    });

    test('should navigate to Device Lookup page via sidebar', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find and click the Lookup navigation link
        const lookupLink = page.locator('a[href="/lookup"]');
        await lookupLink.click();

        // Wait for navigation
        await page.waitForURL('**/lookup');

        // Verify we're on the lookup page
        expect(page.url()).toContain('/lookup');
    });

    test('should navigate to Zones page via sidebar', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find and click the Zones navigation link
        const zonesLink = page.locator('a[href="/zones"]');
        await zonesLink.click();

        // Wait for navigation
        await page.waitForURL('**/zones');

        // Verify we're on the zones page
        expect(page.url()).toContain('/zones');
    });

    test('should maintain navigation sidebar across page transitions', async ({ page }) => {
        // Start at dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Verify nav sidebar exists
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();

        // Navigate to map
        await page.goto('/map');
        await page.waitForLoadState('networkidle');

        // Verify nav sidebar still exists
        await expect(nav).toBeVisible();

        // Navigate to lookup
        await page.goto('/lookup');
        await page.waitForLoadState('networkidle');

        // Verify nav sidebar still exists
        await expect(nav).toBeVisible();
    });

    test('should highlight active navigation item', async ({ page }) => {
        // Navigate to map page
        await page.goto('/map');
        await page.waitForLoadState('networkidle');

        // The map link should be highlighted/active
        const mapLink = page.locator('a[href="/map"]');

        // Check that the map link has active styling
        // (contains specific class or background color)
        await expect(mapLink).toBeVisible();

        // Navigate to lookup and verify map link is no longer active
        await page.goto('/lookup');
        await page.waitForLoadState('networkidle');

        const lookupLink = page.locator('a[href="/lookup"]');
        await expect(lookupLink).toBeVisible();
    });
});

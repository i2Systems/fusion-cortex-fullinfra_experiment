/**
 * Custom Playwright Fixtures
 * 
 * Extends Playwright's test fixtures with custom page objects
 * and helper functions for testing the Fusion Cortex application.
 */

import { test as base, expect, Page } from '@playwright/test';

/**
 * Page object for the Map page
 */
class MapPage {
    constructor(public page: Page) { }

    async goto() {
        await this.page.goto('/map');
        await this.page.waitForLoadState('networkidle');
    }

    async waitForCanvasLoad() {
        // Wait for the Konva container to be present
        // The MapCanvas uses a div with a specific structure
        await this.page.waitForSelector('.konvajs-content', { timeout: 10000 });
    }

    async getToolbar() {
        return this.page.locator('[data-testid="map-toolbar"]').or(
            this.page.locator('button').filter({ hasText: /select|pan|zoom/i }).first()
        );
    }

    async isDevicePanelVisible() {
        const panel = this.page.locator('[data-testid="device-panel"]').or(
            this.page.locator('text=Device Details')
        );
        return panel.isVisible();
    }
}

/**
 * Page object for the Lookup page
 */
class LookupPage {
    constructor(public page: Page) { }

    async goto() {
        await this.page.goto('/lookup');
        await this.page.waitForLoadState('networkidle');
    }

    async getDeviceList() {
        return this.page.locator('[data-testid="device-list"]').or(
            this.page.locator('table').or(this.page.locator('[role="grid"]'))
        );
    }

    async selectDevice(index: number = 0) {
        const rows = this.page.locator('table tr, [role="row"]');
        const row = rows.nth(index + 1); // Skip header
        await row.click();
    }
}

/**
 * Page object for the Zones page
 */
class ZonesPage {
    constructor(public page: Page) { }

    async goto() {
        await this.page.goto('/zones');
        await this.page.waitForLoadState('networkidle');
    }
}

/**
 * Page object for the Dashboard page
 */
class DashboardPage {
    constructor(public page: Page) { }

    async goto() {
        await this.page.goto('/dashboard');
        await this.page.waitForLoadState('networkidle');
    }
}

// Extend Playwright's test with custom fixtures
type CustomFixtures = {
    mapPage: MapPage;
    lookupPage: LookupPage;
    zonesPage: ZonesPage;
    dashboardPage: DashboardPage;
};

export const test = base.extend<CustomFixtures>({
    mapPage: async ({ page }, use) => {
        await use(new MapPage(page));
    },
    lookupPage: async ({ page }, use) => {
        await use(new LookupPage(page));
    },
    zonesPage: async ({ page }, use) => {
        await use(new ZonesPage(page));
    },
    dashboardPage: async ({ page }, use) => {
        await use(new DashboardPage(page));
    },
});

export { expect };

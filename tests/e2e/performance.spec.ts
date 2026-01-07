/**
 * Performance E2E Tests
 * 
 * Tests Core Web Vitals and page load performance.
 * Monitors LCP, CLS, and general page timing.
 */

import { test, expect } from '@playwright/test';

// Performance thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
    LCP: 2500, // Largest Contentful Paint: < 2.5s (good)
    CLS: 0.1,  // Cumulative Layout Shift: < 0.1 (good)
    FCP: 1800, // First Contentful Paint: < 1.8s (good)
    TTI: 3800, // Time to Interactive: < 3.8s (good)
};

// Pages to test for performance
const pagesToTest = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/map', name: 'Map' },
    { path: '/lookup', name: 'Device Lookup' },
    { path: '/zones', name: 'Zones' },
];

test.describe('Performance - Page Load Times', () => {

    for (const pageConfig of pagesToTest) {
        test(`${pageConfig.name} page should load within acceptable time`, async ({ page }) => {
            // Start timing
            const startTime = Date.now();

            await page.goto(pageConfig.path);
            await page.waitForLoadState('domcontentloaded');

            const domContentLoaded = Date.now() - startTime;

            await page.waitForLoadState('networkidle');

            const fullyLoaded = Date.now() - startTime;

            console.log(`\n📊 ${pageConfig.name} Load Times:`);
            console.log(`   DOM Content Loaded: ${domContentLoaded}ms`);
            console.log(`   Fully Loaded: ${fullyLoaded}ms`);

            // Page should load reasonably quickly (allow more time for dev server)
            expect(fullyLoaded).toBeLessThan(10000); // 10s max for dev
        });
    }
});

test.describe('Performance - Core Web Vitals', () => {

    test('Dashboard should meet LCP threshold', async ({ page }) => {
        // Navigate and measure LCP
        await page.goto('/dashboard');

        // Wait for page to stabilize
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Get performance metrics using Performance API
        const lcp = await page.evaluate(async () => {
            return new Promise<number>((resolve) => {
                new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    resolve(lastEntry.startTime);
                }).observe({ type: 'largest-contentful-paint', buffered: true });

                // Fallback timeout
                setTimeout(() => resolve(-1), 5000);
            });
        });

        if (lcp > 0) {
            console.log(`\n📈 Dashboard LCP: ${lcp.toFixed(0)}ms`);
            // In development, allow more lenient thresholds
            expect(lcp).toBeLessThan(THRESHOLDS.LCP * 2);
        }
    });

    test('Map page should not have excessive layout shift', async ({ page }) => {
        await page.goto('/map');

        // Wait for initial render
        await page.waitForLoadState('networkidle');

        // Measure CLS
        const cls = await page.evaluate(async () => {
            return new Promise<number>((resolve) => {
                let clsValue = 0;

                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        // @ts-ignore - Layout shift entries have hadRecentInput
                        if (!entry.hadRecentInput) {
                            // @ts-ignore - value property exists on layout-shift entries
                            clsValue += entry.value;
                        }
                    }
                }).observe({ type: 'layout-shift', buffered: true });

                // Wait a bit for any shifts to occur
                setTimeout(() => resolve(clsValue), 3000);
            });
        });

        console.log(`\n📐 Map Page CLS: ${cls.toFixed(3)}`);

        // CLS should be reasonably low
        expect(cls).toBeLessThan(THRESHOLDS.CLS * 5); // More lenient for dev
    });
});

test.describe('Performance - Resource Loading', () => {

    test('should not load excessive resources on dashboard', async ({ page }) => {
        // Track network requests
        const requests: string[] = [];

        page.on('request', request => {
            requests.push(request.url());
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        console.log(`\n📦 Dashboard loaded ${requests.length} resources`);

        // Should not have excessive requests
        expect(requests.length).toBeLessThan(100);
    });

    test('should not have large bundle sizes causing slow render', async ({ page }) => {
        await page.goto('/dashboard');

        // Measure time to first meaningful content
        const startTime = Date.now();

        // Wait for main content to be visible
        await page.waitForSelector('main', { timeout: 10000 });

        const timeToMainContent = Date.now() - startTime;

        console.log(`\n⏱️ Time to main content: ${timeToMainContent}ms`);

        // Should render main content reasonably quickly
        expect(timeToMainContent).toBeLessThan(5000);
    });
});

test.describe('Performance - Navigation Speed', () => {

    test('client-side navigation should be fast', async ({ page }) => {
        // Initial page load
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Measure client-side navigation
        const startTime = Date.now();

        await page.click('a[href="/map"]');
        await page.waitForURL('**/map');
        await page.waitForLoadState('networkidle');

        const navigationTime = Date.now() - startTime;

        console.log(`\n🚀 Client-side navigation (Dashboard → Map): ${navigationTime}ms`);

        // Client-side navigation should be faster than full page load
        expect(navigationTime).toBeLessThan(3000);
    });

    test('back navigation should be instant', async ({ page }) => {
        // Navigate through pages
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        await page.click('a[href="/map"]');
        await page.waitForURL('**/map');
        await page.waitForLoadState('networkidle');

        // Measure back navigation
        const startTime = Date.now();
        await page.goBack();
        await page.waitForURL('**/dashboard');

        const backTime = Date.now() - startTime;

        console.log(`\n⬅️ Back navigation time: ${backTime}ms`);

        // Back should be very fast (cached)
        expect(backTime).toBeLessThan(2000);
    });
});

test.describe('Performance - Memory Usage', () => {

    test('should not have memory leaks during navigation', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Get initial memory (if available)
        const initialMemory = await page.evaluate(() => {
            // @ts-ignore - Only available in some browsers
            return performance.memory?.usedJSHeapSize || 0;
        });

        // Navigate between pages multiple times
        for (let i = 0; i < 3; i++) {
            await page.click('a[href="/map"]');
            await page.waitForURL('**/map');
            await page.waitForLoadState('networkidle');

            await page.click('a[href="/lookup"]');
            await page.waitForURL('**/lookup');
            await page.waitForLoadState('networkidle');

            await page.click('a[href="/dashboard"]');
            await page.waitForURL('**/dashboard');
            await page.waitForLoadState('networkidle');
        }

        // Check final memory
        const finalMemory = await page.evaluate(() => {
            // @ts-ignore
            return performance.memory?.usedJSHeapSize || 0;
        });

        if (initialMemory > 0 && finalMemory > 0) {
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
            console.log(`\n🧠 Memory change: ${memoryIncrease.toFixed(2)}MB`);

            // Memory should not grow excessively
            expect(memoryIncrease).toBeLessThan(50); // Less than 50MB growth
        }
    });
});

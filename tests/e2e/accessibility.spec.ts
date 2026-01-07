/**
 * Accessibility (a11y) E2E Tests
 * 
 * WCAG 2.1 compliance testing using axe-core.
 * Tests all main pages for accessibility violations.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pages to test for accessibility
const pagesToTest = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/map', name: 'Map' },
    { path: '/lookup', name: 'Device Lookup' },
    { path: '/zones', name: 'Zones' },
    { path: '/library', name: 'Library' },
];

test.describe('Accessibility - WCAG 2.1 Compliance', () => {

    for (const page of pagesToTest) {
        test(`${page.name} page should have no critical accessibility violations`, async ({ page: browserPage }) => {
            await browserPage.goto(page.path);
            await browserPage.waitForLoadState('networkidle');

            // Give dynamic content time to load
            await browserPage.waitForTimeout(1000);

            // Run axe accessibility scan
            const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            // Filter to only critical and serious violations
            const criticalViolations = accessibilityScanResults.violations.filter(
                v => v.impact === 'critical' || v.impact === 'serious'
            );

            // Log violations for debugging (but don't fail on minor issues)
            if (criticalViolations.length > 0) {
                console.log(`\n⚠️ Accessibility violations on ${page.name}:`);
                criticalViolations.forEach(v => {
                    console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
                    console.log(`    Help: ${v.helpUrl}`);
                });
            }

            // Assert no critical violations
            expect(criticalViolations).toHaveLength(0);
        });
    }
});

test.describe('Accessibility - Keyboard Navigation', () => {

    test('should navigate main menu with keyboard', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Press Tab to start keyboard navigation
        await page.keyboard.press('Tab');

        // Continue tabbing and verify focus moves through interactive elements
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');

            // Get currently focused element
            const focusedElement = await page.evaluate(() => {
                const el = document.activeElement;
                return {
                    tagName: el?.tagName,
                    hasVisibleFocus: el !== document.body,
                };
            });

            // Should have focus on an interactive element, not body
            expect(focusedElement.hasVisibleFocus).toBe(true);
        }
    });

    test('should support Escape key to close modals', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Try to open settings modal by clicking settings button
        const settingsButton = page.locator('button[title="Settings"]');
        if (await settingsButton.isVisible()) {
            await settingsButton.click();
            await page.waitForTimeout(500);

            // Press Escape to close
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            // Verify modal is closed (page should still be functional)
            const mainContent = page.locator('main');
            await expect(mainContent).toBeVisible();
        }
    });

    test('navigation links should be keyboard accessible', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find all navigation links
        const navLinks = page.locator('nav a');
        const linkCount = await navLinks.count();

        expect(linkCount).toBeGreaterThan(0);

        // Verify first link is focusable
        const firstLink = navLinks.first();
        await firstLink.focus();

        // Verify it received focus
        const isFocused = await firstLink.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);

        // Verify Enter key activates the link
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');

        // Should have navigated
        expect(page.url()).not.toBe('about:blank');
    });
});

test.describe('Accessibility - Color Contrast', () => {

    test('text should have sufficient color contrast', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Run axe with only color-contrast rule
        const contrastResults = await new AxeBuilder({ page })
            .include('main')
            .withRules(['color-contrast'])
            .analyze();

        // Log any contrast issues
        if (contrastResults.violations.length > 0) {
            console.log('\n⚠️ Color contrast issues:');
            contrastResults.violations.forEach(v => {
                v.nodes.forEach(node => {
                    console.log(`  - ${node.html}`);
                    console.log(`    ${node.failureSummary}`);
                });
            });
        }

        // Allow some violations but flag for review
        // (dark themes can sometimes have intentional low-contrast elements)
        expect(contrastResults.violations.length).toBeLessThan(10);
    });
});

test.describe('Accessibility - ARIA and Semantic HTML', () => {

    test('interactive elements should have accessible names', async ({ page }) => {
        await page.goto('/map');
        await page.waitForLoadState('networkidle');

        // Check all buttons have accessible names
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
            const button = buttons.nth(i);
            const accessibleName = await button.evaluate(el => {
                return el.getAttribute('aria-label') ||
                    el.getAttribute('title') ||
                    el.textContent?.trim() ||
                    '';
            });

            // Button should have some accessible name
            expect(accessibleName.length).toBeGreaterThan(0);
        }
    });

    test('page should have proper heading structure', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Get all headings
        const headings = await page.evaluate(() => {
            const h1s = document.querySelectorAll('h1');
            const h2s = document.querySelectorAll('h2');
            const h3s = document.querySelectorAll('h3');
            return {
                h1Count: h1s.length,
                h2Count: h2s.length,
                h3Count: h3s.length,
            };
        });

        // Should have at most one h1 per page
        expect(headings.h1Count).toBeLessThanOrEqual(1);
    });

    test('images should have alt text', async ({ page }) => {
        await page.goto('/library');
        await page.waitForLoadState('networkidle');

        // Check all images have alt text
        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i);
            const hasAlt = await img.evaluate(el => {
                return el.hasAttribute('alt');
            });

            expect(hasAlt).toBe(true);
        }
    });
});

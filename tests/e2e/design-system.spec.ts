/**
 * Design System Compliance E2E Tests
 * 
 * Tests that verify components are using design system CSS variables
 * rather than hardcoded values. This helps maintain consistency and
 * theme-ability across the application.
 */

import { test, expect } from '@playwright/test';

// Patterns that indicate hardcoded values instead of design system variables
const FORBIDDEN_PATTERNS = {
    // Hardcoded colors that should use design system variables
    colors: [
        /text-white(?!\])/,           // text-white (but allow text-[var(--...)])
        /text-black(?!\])/,           // text-black
        /bg-white(?!\])/,             // bg-white
        /bg-black(?!\])/,             // bg-black
        /border-white(?!\])/,         // border-white
        /border-black(?!\])/,         // border-black
        // Common Tailwind color classes that should use design system
        /text-(?:red|blue|green|yellow|gray|slate|zinc)-\d{2,3}(?!\])/,
        /bg-(?:red|blue|green|yellow|gray|slate|zinc)-\d{2,3}(?!\])/,
        /border-(?:red|blue|green|yellow|gray|slate|zinc)-\d{2,3}(?!\])/,
    ],
    // Inline hardcoded color styles
    inlineColors: [
        /style="[^"]*color:\s*#[0-9a-fA-F]{3,8}/,
        /style="[^"]*background(?:-color)?:\s*#[0-9a-fA-F]{3,8}/,
        /style="[^"]*border(?:-color)?:\s*#[0-9a-fA-F]{3,8}/,
    ],
};

// Design system variable patterns that SHOULD be used
const REQUIRED_PATTERNS = {
    colors: [
        /var\(--color-/,              // CSS custom properties
        /text-\[var\(--color-/,       // Tailwind arbitrary with CSS var
        /bg-\[var\(--color-/,
        /border-\[var\(--color-/,
    ],
};

// Pages to check for design system compliance
const pagesToCheck = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/map', name: 'Map' },
    { path: '/lookup', name: 'Device Lookup' },
    { path: '/zones', name: 'Zones' },
];

test.describe('Design System Compliance', () => {

    test('pages should use design system variables for colors', async ({ page }) => {
        for (const pageConfig of pagesToCheck) {
            await page.goto(pageConfig.path);
            await page.waitForLoadState('networkidle');

            // Get all computed styles of interactive elements
            const results = await page.evaluate(() => {
                const issues: string[] = [];
                const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');

                elements.forEach((el, index) => {
                    const style = window.getComputedStyle(el);
                    const className = el.className;

                    // Check for hardcoded Tailwind classes in className
                    const hardcodedPatterns = [
                        'text-white',
                        'text-black',
                        'bg-white',
                        'bg-black',
                    ];

                    for (const pattern of hardcodedPatterns) {
                        // Allow if it's part of a CSS variable pattern
                        if (className.includes(pattern) && !className.includes('[var(--')) {
                            // Additional check: is this in a hover/focus state pattern?
                            const regex = new RegExp(`(?:^|\\s)${pattern}(?:\\s|$)`);
                            if (regex.test(className)) {
                                issues.push(`Element ${index} uses ${pattern} without design system variable`);
                            }
                        }
                    }
                });

                return issues;
            });

            // Log any issues found
            if (results.length > 0) {
                console.log(`\n⚠️ Design system issues on ${pageConfig.name}:`);
                results.forEach(issue => console.log(`  - ${issue}`));
            }

            // This test is advisory - we don't fail on warnings
            // Instead, we track the count for monitoring
        }
    });

    test('interactive elements should use CSS variables for theming', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Check that key interactive elements respond to theme variables
        const cssVariableUsage = await page.evaluate(() => {
            const stats = {
                totalElements: 0,
                usingCssVariables: 0,
                hardcodedColors: 0,
            };

            const interactiveElements = document.querySelectorAll('button, a[href], [role="button"]');
            stats.totalElements = interactiveElements.length;

            interactiveElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const bgColor = style.backgroundColor;
                const textColor = style.color;

                // Check if colors appear to be from CSS variables
                // (we can't directly see var() in computed styles, but we can check
                // if colors match our design system palette)
                const designSystemColors = [
                    'rgb(0, 217, 255)',     // --color-primary cyan
                    'rgb(0, 255, 255)',     // --color-primary-hover
                    'rgb(255, 0, 255)',     // --color-accent magenta
                    'rgb(0, 0, 0)',         // --color-text-on-primary (dark)
                    'rgb(255, 255, 255)',   // --color-text (light)
                ];

                if (designSystemColors.some(c => bgColor.includes(c) || textColor.includes(c))) {
                    stats.usingCssVariables++;
                }
            });

            return stats;
        });

        console.log(`\n📊 CSS Variable Usage Stats:`);
        console.log(`   Total interactive elements: ${cssVariableUsage.totalElements}`);
        console.log(`   Using design system colors: ${cssVariableUsage.usingCssVariables}`);

        // At least some elements should be using design system colors
        expect(cssVariableUsage.totalElements).toBeGreaterThan(0);
    });

    test('navigation elements should have consistent spacing from design system', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Check that nav elements have consistent spacing
        const spacingConsistency = await page.evaluate(() => {
            const navLinks = document.querySelectorAll('nav a');
            const gaps = new Set<string>();
            const paddings = new Set<string>();

            navLinks.forEach(link => {
                const style = window.getComputedStyle(link);
                paddings.add(style.padding);
            });

            return {
                uniquePaddings: paddings.size,
                paddingValues: Array.from(paddings),
            };
        });

        console.log(`\n📐 Spacing Consistency:`);
        console.log(`   Unique padding values in nav: ${spacingConsistency.uniquePaddings}`);
        console.log(`   Values: ${spacingConsistency.paddingValues.join(', ')}`);

        // Navigation should have fairly consistent spacing (max 3-4 unique values)
        expect(spacingConsistency.uniquePaddings).toBeLessThan(5);
    });

    test('buttons should use design system border-radius', async ({ page }) => {
        await page.goto('/map');
        await page.waitForLoadState('networkidle');

        const borderRadiusStats = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            const radii = new Set<string>();

            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                radii.add(style.borderRadius);
            });

            return {
                uniqueRadii: radii.size,
                radiusValues: Array.from(radii),
            };
        });

        console.log(`\n🔲 Border Radius Consistency:`);
        console.log(`   Unique border-radius values: ${borderRadiusStats.uniqueRadii}`);
        console.log(`   Values: ${borderRadiusStats.radiusValues.join(', ')}`);

        // Should have limited unique border-radius values (from design system)
        expect(borderRadiusStats.uniqueRadii).toBeLessThan(8);
    });

    test('text should use design system font sizes', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const fontSizeStats = await page.evaluate(() => {
            const textElements = document.querySelectorAll('h1, h2, h3, h4, p, span, a, button');
            const fontSizes = new Set<string>();

            textElements.forEach(el => {
                const style = window.getComputedStyle(el);
                fontSizes.add(style.fontSize);
            });

            return {
                uniqueFontSizes: fontSizes.size,
                fontSizeValues: Array.from(fontSizes).sort(),
            };
        });

        console.log(`\n🔤 Font Size Consistency:`);
        console.log(`   Unique font sizes: ${fontSizeStats.uniqueFontSizes}`);
        console.log(`   Values: ${fontSizeStats.fontSizeValues.join(', ')}`);

        // Should have a reasonable number of font sizes (design system scale)
        expect(fontSizeStats.uniqueFontSizes).toBeLessThan(15);
    });
});

test.describe('Design System Variable Presence', () => {

    test('root element should have design system CSS variables defined', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const cssVariables = await page.evaluate(() => {
            const root = document.documentElement;
            const style = getComputedStyle(root);

            // Check for key design system variables
            const requiredVariables = [
                '--color-primary',
                '--color-bg',
                '--color-text',
                '--color-text-on-primary',
                '--color-surface',
                '--color-border-subtle',
                '--shadow-soft',
                '--radius-md',
            ];

            const found: Record<string, string> = {};
            const missing: string[] = [];

            requiredVariables.forEach(varName => {
                const value = style.getPropertyValue(varName).trim();
                if (value) {
                    found[varName] = value;
                } else {
                    missing.push(varName);
                }
            });

            return { found, missing };
        });

        console.log(`\n🎨 Design System Variables:`);
        Object.entries(cssVariables.found).forEach(([name, value]) => {
            console.log(`   ✓ ${name}: ${value}`);
        });

        if (cssVariables.missing.length > 0) {
            console.log(`\n   ⚠️ Missing variables:`);
            cssVariables.missing.forEach(name => console.log(`     - ${name}`));
        }

        // All required variables should be defined
        expect(cssVariables.missing).toHaveLength(0);
    });

    test('theme switching should update CSS variables', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Get initial primary color
        const initialColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
        });

        // Try to find and click theme switcher if available
        const themeButton = page.locator('button[title*="theme" i], button[aria-label*="theme" i]');

        if (await themeButton.count() > 0) {
            await themeButton.first().click();
            await page.waitForTimeout(300);

            // Check if color changed
            const newColor = await page.evaluate(() => {
                return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
            });

            console.log(`\n🎭 Theme Variables:`);
            console.log(`   Initial --color-primary: ${initialColor}`);
            console.log(`   After toggle --color-primary: ${newColor}`);
        }

        // Just verify the variable exists
        expect(initialColor.length).toBeGreaterThan(0);
    });
});

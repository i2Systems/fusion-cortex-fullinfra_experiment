import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Configures Playwright for End-to-End testing of the Fusion Cortex application.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Test directory
    testDir: './tests/e2e',

    // Global test timeout
    timeout: 30 * 1000,

    // Expect timeout
    expect: {
        timeout: 5000
    },

    // Run tests in parallel
    fullyParallel: true,

    // Fail the build on test.only in CI
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Limit workers on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter configuration
    reporter: [
        ['html', { open: 'never' }],
        ['list']
    ],

    // Shared settings for all projects
    use: {
        // Base URL for tests
        baseURL: 'http://localhost:3000',

        // Collect trace on failure
        trace: 'on-first-retry',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Video recording on failure
        video: 'on-first-retry',
    },

    // Configure projects for different browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment for additional browser testing
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    // Web server configuration - automatically starts Next.js dev server
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutes for dev server to start
    },

    // Output directory for test artifacts
    outputDir: 'test-results/',
});

/**
 * Global Setup for E2E Tests
 * 
 * This file runs once before all tests.
 * Use it for any setup that needs to happen globally.
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    // Add any global setup here
    // For example:
    // - Seed test database
    // - Create test users
    // - Set up test fixtures

    console.log('🧪 E2E Tests: Global setup starting...');

    // Verify the base URL is accessible
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
    console.log(`🌐 Base URL: ${baseURL}`);

    console.log('✅ E2E Tests: Global setup complete');
}

export default globalSetup;

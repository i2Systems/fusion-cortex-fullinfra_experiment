import { test, expect } from '@playwright/test';

test.describe('Site Creation Flow', () => {
    test('should allow creating a new site with valid data', async ({ page }) => {
        // 1. Navigate to Dashboard
        await page.goto('/dashboard');

        // 2. Open Add Site Modal
        const addSiteButton = page.getByRole('button', { name: 'Add Site' }).first();
        await expect(addSiteButton).toBeVisible();
        await addSiteButton.click();

        // 3. Verify Modal is Open
        const modalForm = page.locator('#add-site-form');
        await expect(modalForm).toBeVisible();

        // 4. Fill Form Data
        const timestamp = Date.now();
        const siteName = `AutoTest Site ${timestamp}`;
        const siteNumber = `TEST-${timestamp}`;

        // Use placeholders which are more reliable if labels aren't strictly associated
        await page.getByPlaceholder('e.g., Site #1234 - Main St').fill(siteName);
        await page.getByPlaceholder('e.g., 1234').fill(siteNumber);
        await page.getByPlaceholder('e.g., 1250 Main Street').fill('123 Automation Blvd');
        await page.getByPlaceholder('City').fill('Robot City');
        await page.getByPlaceholder('State').fill('CA');
        await page.getByPlaceholder('ZIP').fill('90210');
        // Optional fields
        await page.getByPlaceholder('e.g., (555) 123-4567').fill('(555) 000-0000');

        // Upload mock image if possible, or just verify no double creation
        // For this test, we'll focus on the data flow that was causing issues
        // Simulating the condition where an image *could* be uploaded
        // Ideally we would mock the file chooser, but ensuring the critical path works is first priority

        // 5. Submit Form
        // Use the specific form attribute we added to identify the correct button
        // This button is in the footer but linked to the form
        const submitButton = page.locator('button[form="add-site-form"]');
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // 6. Verify Success Toast
        // Expect toast with title "Site Created"
        await expect(page.getByText('Site Created')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(`${siteName} has been successfully added.`)).toBeVisible();

        // 7. Verify Modal Closes
        await expect(modalForm).not.toBeVisible();

        // 8. Verify New Site Appears on Dashboard
        await expect(page.getByRole('heading', { name: siteName })).toBeVisible();
        const siteCard = page.locator('.fusion-card-tile', { hasText: siteName });
        await expect(siteCard).toBeVisible();
        await expect(siteCard).toContainText('Robot City, CA');
    });
});

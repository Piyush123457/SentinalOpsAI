import { test, expect } from '@playwright/test';

test.describe('SentinelOps AI — E2E Workflow Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('1. Loads the incident command center dashboard with enterprise layout', async ({ page }) => {
    // Title & Brand
    await expect(page).toHaveTitle(/SentinelOps AI/i);
    await expect(page.locator('text=SentinelOps AI').first()).toBeVisible();
    await expect(page.locator('text=Autonomous SRE').first()).toBeVisible();

    // Navigation links in sidebar
    await expect(page.locator('button:has-text("Workflows")')).toBeVisible();
    await expect(page.locator('button:has-text("Task Runs")')).toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).toBeVisible();

    // AI Operator Panel
    await expect(page.locator('text=AI SRE Operator Interface')).toBeVisible();
    await expect(page.locator('button:has-text("Deterministic Demo")')).toBeVisible();
    await expect(page.locator('button:has-text("Dispatch")')).toBeVisible();

    // Workflow Tabs
    await expect(page.locator('button:has-text("Timeline Track")')).toBeVisible();
    await expect(page.locator('button:has-text("Task List")')).toBeVisible();
    await expect(page.locator('button:has-text("Activity Monitor")')).toBeVisible();
  });

  test('2. Switches workflow tabs and displays content', async ({ page }) => {
    // Switch to Task List tab
    await page.locator('button:has-text("Task List")').click();
    await expect(page.locator('text=Task List').first()).toBeVisible();

    // Switch to Activity Monitor tab
    await page.locator('button:has-text("Activity Monitor")').first().click();
    await expect(page.locator('text=Real-Time Activity Stream')).toBeVisible();

    // Switch back to Timeline Track
    await page.locator('button:has-text("Timeline Track")').click();
    await expect(page.locator('button:has-text("Timeline Track")')).toBeVisible();
  });

  test('3. Dispatches task via AI Operator interface and observes execution', async ({ page }) => {
    // Click Scenario A preset button
    await page.locator('button:has-text("Scenario A: Worker Disabled")').click();

    // Dispatch task
    await page.locator('button:has-text("Dispatch")').click();

    // Wait for task to be processed and completed
    await expect(page.locator('header span:has-text("COMPLETED")')).toBeVisible({ timeout: 25000 });

    // Expect "View Incident Report" button to appear in header
    const reportBtn = page.locator('button:has-text("View Incident Report")');
    await expect(reportBtn).toBeVisible({ timeout: 10000 });

    // Open Incident Report Modal
    await reportBtn.click();
    await expect(page.locator('text=Executive Summary')).toBeVisible();
    await expect(page.locator('text=Technical Root Cause Analysis')).toBeVisible();
    await expect(page.locator('text=Before & After Metrics Verification')).toBeVisible();

    // Close Report Modal
    await page.locator('button:has-text("Close Report")').click();
    await expect(page.locator('text=Executive Summary')).not.toBeVisible();
  });
});

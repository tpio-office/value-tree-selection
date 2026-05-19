import { test, expect } from '@playwright/test';

test.describe('Debug - Add Back Siblings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('debug hasExcludedSiblings state', async ({ page }) => {
    // Get initial node count
    const initialCount = await page.locator('[data-testid^="node-"]').count();
    console.log(`Initial node count: ${initialCount}`);

    // Step 1: Keep Path Only on Engineering
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    
    // Check: siblings gone after Keep Path Only
    await expect(page.locator('[data-testid="node-Marketing"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="node-Sales"]')).not.toBeVisible({ timeout: 5000 });

    const afterKeepPathCount = await page.locator('[data-testid^="node-"]').count();
    console.log(`After Keep Path Only count: ${afterKeepPathCount}`);

    // Wait for tree to fully settle
    await page.waitForTimeout(500);
    
    // Click Engineering circle again
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    await engineeringNode.locator('circle').click({ force: true });
    
    // Check if context menu appeared
    try {
      await expect(contextMenu).toBeVisible({ timeout: 3000 });
      console.log('Context menu appeared after 2nd click ✓');
      
      const hasAddBack = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
      console.log('Add Back Siblings button visible:', hasAddBack);
      
      const hasKeepPath = await page.locator('[data-testid="keep-path-only-btn"]').isVisible();
      console.log('Keep Path Only button visible:', hasKeepPath);
    } catch (e) {
      console.log('Context menu did not appear after second click');
    }
  });
});

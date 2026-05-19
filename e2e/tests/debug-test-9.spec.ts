import { test, expect } from '@playwright/test';

test.describe('Debug - CD workaround', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('try different CD workarounds', async ({ page }) => {
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="node-Marketing"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="node-Sales"]')).not.toBeVisible({ timeout: 5000 });

    // Option A: wait 1s before clicking
    await page.waitForTimeout(1000);
    await engineeringNode.locator('circle').click();
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    const visibleA = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
    console.log('After 1s wait:', visibleA);
    
    // Hide menu
    await page.locator('[data-testid="canvas-wrapper"]').click({ position: { x: 10, y: 500 } });
    await expect(contextMenu).not.toBeVisible({ timeout: 3000 });

    // Option B: trigger Angular CD via getComponent before click
    await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      ng.getComponent(el); // just access it
    });
    await engineeringNode.locator('circle').click();
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    const visibleB = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
    console.log('After ng.getComponent:', visibleB);
    
    // Hide menu
    await page.locator('[data-testid="canvas-wrapper"]').click({ position: { x: 10, y: 500 } });
    await expect(contextMenu).not.toBeVisible({ timeout: 3000 });

    // Option C: use page.evaluate to set property and call detectChanges
    await engineeringNode.locator('circle').click();
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      // Re-set the property and force CD
      (comp as any).menuHasExcludedSiblings = (comp as any).treeService.hasExcludedSiblings('2');
      (comp as any).cdr.detectChanges();
    });
    
    await page.waitForTimeout(100);
    const visibleC = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
    console.log('After re-set + detectChanges:', visibleC);
  });
});

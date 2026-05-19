import { test, expect } from '@playwright/test';

test.describe('Debug - Angular CD timing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('check if button appears after extra CD', async ({ page }) => {
    // Step 1: Keep Path Only on Engineering
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="node-Marketing"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="node-Sales"]')).not.toBeVisible({ timeout: 5000 });

    // Step 2: Open context menu
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    await engineeringNode.locator('circle').click({ force: true });
    await expect(contextMenu).toBeVisible({ timeout: 3000 });

    // Check immediately
    let visible = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
    console.log('Visible immediately:', visible);
    
    // Force Angular change detection
    await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      if (comp) {
        console.log('menuHasExcludedSiblings:', (comp as any).menuHasExcludedSiblings);
        // Try to apply changes
        ng.applyChanges(comp);
      }
    });
    
    await page.waitForTimeout(200);
    visible = await page.locator('[data-testid="add-back-siblings-btn"]').isVisible();
    console.log('Visible after applyChanges:', visible);
    
    // Try evaluating input on the child component
    const childState = await page.evaluate(() => {
      const menuEl = document.querySelector('app-node-context-menu')!;
      const ng = (window as any).ng;
      const menuComp = ng.getComponent(menuEl);
      if (!menuComp) return { error: 'no menu component' };
      return {
        hasExcludedSiblings: (menuComp as any).hasExcludedSiblings,
        hasSiblings: (menuComp as any).hasSiblings,
      };
    });
    console.log('Child component state:', JSON.stringify(childState));
  });
});

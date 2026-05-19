import { test, expect } from '@playwright/test';

test.describe('Debug - ng.getComponent theory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('trigger markForCheck via ng.getComponent before Keep Path Only', async ({ page }) => {
    // Call ng.getComponent BEFORE any clicks to trigger markForCheck
    await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      ng.getComponent(el); // Just access it
    });

    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="node-Marketing"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="node-Sales"]')).not.toBeVisible({ timeout: 5000 });

    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    await engineeringNode.locator('circle').click();
    await expect(contextMenu).toBeVisible({ timeout: 3000 });

    const addBackBtn = page.locator('[data-testid="add-back-siblings-btn"]');
    const visible = await addBackBtn.isVisible();
    console.log('Add Back Siblings visible:', visible);
    
    if (!visible) {
      const childState = await page.evaluate(() => {
        const menuEl = document.querySelector('app-node-context-menu')!;
        if (!menuEl) return { error: 'no menu el' };
        const ng = (window as any).ng;
        const menuComp = ng.getComponent(menuEl);
        if (!menuComp) return { error: 'no menu comp' };
        return {
          hasExcludedSiblings: (menuComp as any).hasExcludedSiblings,
          hasSiblings: (menuComp as any).hasSiblings,
          props: Object.getOwnPropertyNames(menuComp).filter(n => !n.startsWith('_')),
        };
      });
      console.log('Child state:', JSON.stringify(childState));
      
      // Also try calling handleAddBackSiblings directly to verify it works
      await page.evaluate(() => {
        const el = document.querySelector('app-graph-canvas')!;
        const ng = (window as any).ng;
        const comp = ng.getComponent(el);
        (comp as any).handleAddBackSiblings();
      });
    }
  });
});

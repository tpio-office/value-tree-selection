import { test, expect } from '@playwright/test';

test.describe('Debug - click behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('check with force:true and force:false', async ({ page }) => {
    // Step 1: Keep Path Only on Engineering
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    
    // Verify siblings gone
    await expect(page.locator('[data-testid="node-Marketing"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="node-Sales"]')).not.toBeVisible({ timeout: 5000 });

    // Step 2: Try WITHOUT force:true
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });

    // Check actionability requirements for the circle
    const actionable = await engineeringNode.locator('circle').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        rect: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        isConnected: el.isConnected,
        parentVisible: el.parentElement ? window.getComputedStyle(el.parentElement).display !== 'none' : false,
      };
    });
    console.log('Circle actionability:', JSON.stringify(actionable));

    await engineeringNode.locator('circle').click();  // No force (original)
    
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    // Check state after context menu open
    const stateAfter = await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      if (!comp) return { error: 'no component' };
      const ts = (comp as any).treeService;
      return {
        menuHasExcludedSiblings: (comp as any).menuHasExcludedSiblings,
        menuNodeId: (comp as any).menuNodeId,
        excludedNodeIds: ts.excludedNodeIdsSubject?.value ? Array.from(ts.excludedNodeIdsSubject.value) : [],
        selectedBranchIds: ts.selectedBranchIdsSubject?.value ? Array.from(ts.selectedBranchIdsSubject.value) : [],
        hasExcludedSiblings2: ts.hasExcludedSiblings('2'),
      };
    });
    console.log('STATE AFTER (no force):', JSON.stringify(stateAfter));

    // Check if the button is visible
    const addBackBtn = page.locator('[data-testid="add-back-siblings-btn"]');
    const isVisible = await addBackBtn.isVisible();
    console.log('Add Back Siblings button visible:', isVisible);
    
    if (!isVisible) {
      // Get the full context menu HTML
      const menuHTML = await page.evaluate(() => {
        const menu = document.querySelector('[data-testid="context-menu"]');
        return menu ? menu.innerHTML : 'no menu';
      });
      console.log('Context menu HTML:', menuHTML);
    }
  });
});

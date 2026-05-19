import { test, expect } from '@playwright/test';

test.describe('Debug - Context Menu Node ID', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('check context menu node ID after Keep Path Only', async ({ page }) => {
    // Step 1: Keep Path Only on Engineering
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    
    // Wait for tree to settle
    await page.waitForTimeout(500);
    
    // Before second click, let me check what's in the service
    // by accessing the Angular component's data
    const engCircleData = await page.evaluate(() => {
      const engNode = document.querySelector('[data-testid="node-Engineering"] circle') as SVGCircleElement | null;
      if (!engNode) return { error: 'no circle' };
      // Playwright clicks use dispatchEvent, so let me instead check if the node exists
      return {
        found: true,
        parentNodeTestId: engNode.closest('[data-testid^="node-"]')?.getAttribute('data-testid'),
      };
    });
    console.log('Engineering circle info:', JSON.stringify(engCircleData));
    
    // Click Engineering circle again
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    await engineeringNode.locator('circle').click();
    
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    // After the context menu is open, check what was set
    const menuInfo = await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas');
      if (!el) return { error: 'no app-graph-canvas' };
      // Access Angular component instance through __ngContext__
      // The component class might be accessible via the LView (logical view)
      return { 
        hasElement: true,
        componentName: el.tagName,
        childCount: el.children.length
      };
    });
    console.log('Graph canvas info:', JSON.stringify(menuInfo));

    // Now let's directly check what nodes are in the D3 SVG
    const svgNodes = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return { error: 'no svg' };
      const nodeGroups = svg.querySelectorAll('g.node');
      return Array.from(nodeGroups).map(g => ({
        testId: g.getAttribute('data-testid'),
        circleR: g.querySelector('circle')?.getAttribute('r'),
      }));
    });
    console.log('SVG nodes:', JSON.stringify(svgNodes));
  });
});

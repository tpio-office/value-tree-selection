import { test, expect } from '@playwright/test';

test.describe('Debug - trace showContextMenu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('trace showContextMenu calls', async ({ page }) => {
    // Monkey-patch the showContextMenu call via Angular component prototype
    await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      if (comp) {
        const original = (comp as any).showContextMenu.bind(comp);
        (comp as any).showContextMenu = function(event: any, nodeData: any) {
          const ts = (this as any).treeService;
          const excludedIds = ts.excludedNodeIdsSubject?.value;
          console.log('PRE-showContextMenu', {
            nodeId: nodeData.data.id,
            nodeName: nodeData.data.name,
            excludedNodeIds: excludedIds ? Array.from(excludedIds) : [],
            hasExcludedSiblings: ts.hasExcludedSiblings(nodeData.data.id),
            selectedBranchIds: ts.selectedBranchIdsSubject?.value ? Array.from(ts.selectedBranchIdsSubject.value) : [],
            rawDataChildren: ts.rawData?.children?.map((c: any) => c.id + ':' + c.name),
          });
          return original(event, nodeData);
        };
      }
    });

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

    // Step 2: Click Engineering again
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'debug') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Force click and check state BEFORE context menu opens
    const stateBefore = await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      const ts = (comp as any).treeService;
      return {
        excludedNodeIds: ts.excludedNodeIdsSubject?.value ? Array.from(ts.excludedNodeIdsSubject.value) : [],
        selectedBranchIds: ts.selectedBranchIdsSubject?.value ? Array.from(ts.selectedBranchIdsSubject.value) : [],
        hasExcludedSiblings2: ts.hasExcludedSiblings('2'),
      };
    });
    console.log('STATE BEFORE CLICK:', JSON.stringify(stateBefore));
    
    await engineeringNode.locator('circle').click({ force: true });
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    for (const log of consoleLogs) {
      console.log('CONSOLE:', log);
    }
    
    // Check state after
    const stateAfter = await page.evaluate(() => {
      const el = document.querySelector('app-graph-canvas')!;
      const ng = (window as any).ng;
      const comp = ng.getComponent(el);
      const ts = (comp as any).treeService;
      return {
        menuHasExcludedSiblings: (comp as any).menuHasExcludedSiblings,
        menuNodeId: (comp as any).menuNodeId,
        excludedNodeIds: ts.excludedNodeIdsSubject?.value ? Array.from(ts.excludedNodeIdsSubject.value) : [],
        selectedBranchIds: ts.selectedBranchIdsSubject?.value ? Array.from(ts.selectedBranchIdsSubject.value) : [],
        hasExcludedSiblings2: ts.hasExcludedSiblings('2'),
      };
    });
    console.log('STATE AFTER:', JSON.stringify(stateAfter));
  });
});

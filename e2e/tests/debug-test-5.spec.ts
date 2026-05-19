import { test, expect } from '@playwright/test';

test.describe('Debug - Angular internals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('access tree service via Angular debug API', async ({ page }) => {
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

    // Try to access Angular component via different methods
    const result = await page.evaluate(() => {
      const messages: string[] = [];
      
      // Try ng global
      const ng = (window as any).ng;
      messages.push('ng exists: ' + !!ng);
      
      if (ng) {
        messages.push('ng keys: ' + Object.keys(ng).join(', '));
        
        // Try to get component from the graph canvas element
        const el = document.querySelector('app-graph-canvas');
        if (el) {
          try {
            const component = ng.getComponent(el);
            messages.push('got component: ' + (component ? component.constructor?.name : 'null'));
            if (component) {
              const comp = component as any;
              messages.push('menuNodeId: ' + comp.menuNodeId);
              messages.push('menuHasExcludedSiblings: ' + comp.menuHasExcludedSiblings);
              messages.push('menuHasSiblings: ' + comp.menuHasSiblings);
              
              // Access treeService
              const ts = comp.treeService;
              if (ts) {
                const excludedIds = ts.excludedNodeIdsSubject?.value;
                messages.push('excludedNodeIds: ' + (excludedIds ? JSON.stringify(Array.from(excludedIds)) : 'undefined'));
                
                const branchIds = ts.selectedBranchIdsSubject?.value;
                messages.push('selectedBranchIds: ' + (branchIds ? JSON.stringify(Array.from(branchIds)) : 'undefined'));
                
                // Call hasExcludedSiblings directly
                messages.push('hasExcludedSiblings("2"): ' + ts.hasExcludedSiblings('2'));
                messages.push('hasExcludedSiblings("3"): ' + ts.hasExcludedSiblings('3'));
                
                // Direct sibling check
                const rawData = ts.rawData;
                messages.push('rawData children: ' + (rawData?.children?.map((c: any) => c.id + ':' + c.name).join(', ') || 'none'));
              }
            }
          } catch (e: any) {
            messages.push('error: ' + (e?.message || String(e)));
          }
        }
      }
      
      // Also try __ngContext__ approach
      const el2 = document.querySelector('app-graph-canvas') as any;
      if (el2) {
        messages.push('__ngContext__ type: ' + typeof el2.__ngContext__ + ' value: ' + String(el2.__ngContext__));
      }
      
      return messages;
    });
    
    for (const msg of result) {
      console.log('BROWSER:', msg);
    }
  });
});

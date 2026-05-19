import { test, expect } from '@playwright/test';

test.describe('Debug - find the bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('direct check of excludedNodeIds value via console', async ({ page }) => {
    // Listen to console log messages from the browser
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'debug') {
        consoleLogs.push(msg.text());
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

    // Check the Angular component state using a hack
    await page.evaluate(() => {
      // We can capture the TreeService singleton via the DOM
      const appRoot = document.querySelector('app-root');
      if (!appRoot) return;
      const ngCtx = (appRoot as any).__ngContext__;
      
      // The TreeService is injected into all components.
      // Let's find the graph-canvas component and get the tree service from it.
      const el = document.querySelector('app-graph-canvas') as any;
      if (!el) { console.log('NO GRAPH CANVAS'); return; }
      
      // Angular 17+ Ivy: LView is stored in __ngContext__
      const ctx = el.__ngContext__;
      if (!ctx) { console.log('NO NG CONTEXT'); return; }
      
      // We need to find the component instance. In Angular's LView structure,
      // the component is in the decls. Let's try different approaches.
      
      // Approach 1: Search for the TreeService in the injector
      // Approach 2: Attach a global function from the component
      console.log('typeof ngCtx:', typeof ctx, Array.isArray(ctx) ? ctx.length : 'not array');
      
      // Try to reach the component instance via the LView
      // The LView is an array. The component instance is typically at index 1 after element
      // or at a known position. Let's dump some indices.
      if (Array.isArray(ctx)) {
        for (let i = 0; i < Math.min(ctx.length, 20); i++) {
          const val = ctx[i];
          if (val && typeof val === 'object' && val.constructor) {
            const name = val.constructor.name;
            if (name === 'GraphCanvasComponent') {
              console.log('FOUND GraphCanvasComponent at index', i);
              // Check the treeService property
              const ts = (val as any).treeService;
              if (ts) {
                console.log('treeService found');
                // Check excludedNodeIds via direct subject access
                const excludedIds = ts.excludedNodeIdsSubject?.value;
                const excludedArr = excludedIds ? Array.from(excludedIds) : 'no subject';
                console.log('EXCLUDED_NODE_IDS:', JSON.stringify(excludedArr));
                
                const branchIds = ts.selectedBranchIdsSubject?.value;
                const branchArr = branchIds ? Array.from(branchIds) : 'no subject';
                console.log('SELECTED_BRANCH_IDS:', JSON.stringify(branchArr));
                
                // Test hasExcludedSiblings directly
                const hasExcluded = ts.hasExcludedSiblings('2');
                console.log('hasExcludedSiblings("2"):', hasExcluded);
                
                // Manually trace hasExcludedSiblings
                const rawData = ts.rawData;
                const findParent = (node: any, childId: string): any => {
                  if (!node.children) return null;
                  for (const child of node.children) {
                    if (child.id === childId) return node;
                    const found = findParent(child, childId);
                    if (found) return found;
                  }
                  return null;
                };
                const parent = findParent(rawData, '2');
                console.log('parent of Engineering:', parent?.name, parent?.children?.map((c: any) => c.id));
                
                if (parent && parent.children) {
                  for (const child of parent.children) {
                    if (child.id === '2') continue;
                    console.log('Checking sibling:', child.name, child.id, 'in excluded?', excludedIds?.has(child.id));
                  }
                }
              }
              break;
            }
          }
        }
      }
    });
    
    await page.waitForTimeout(500);
    
    // Output logs
    for (const log of consoleLogs) {
      console.log('BROWSER:', log);
    }
  });
});

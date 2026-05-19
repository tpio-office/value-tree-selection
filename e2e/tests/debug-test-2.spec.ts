import { test, expect } from '@playwright/test';

test.describe('Debug - Service State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('check service excludedNodeIds state', async ({ page }) => {
    // Expose service state via console
    await page.evaluate(() => {
      (window as any).__debugState = () => {
        const el = document.querySelector('app-graph-canvas');
        if (!el) return 'no graph canvas';
        const ngCtx = (el as any).__ngContext__;
        return ngCtx ? 'has ng context' : 'no ng context';
      };
    });

    // Step 1: Keep Path Only on Engineering
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    
    // Check state after Keep Path Only
    await page.waitForTimeout(300);
    
    // Click Engineering circle again
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });
    
    // Before clicking, check state by evaluating what's on the page
    const nodesInDOM = await page.evaluate(() => {
      const allNodes = document.querySelectorAll('[data-testid^="node-"]');
      return Array.from(allNodes).map(n => n.getAttribute('data-testid'));
    });
    console.log('Nodes with testid:', nodesInDOM.length, nodesInDOM.slice(0, 5), '...');
    
    await engineeringNode.locator('circle').click();
    await expect(contextMenu).toBeVisible({ timeout: 3000 });

    // Check the rendered context menu buttons
    const menuButtons = await page.evaluate(() => {
      const menu = document.querySelector('[data-testid="context-menu"]');
      if (!menu) return 'no menu';
      return {
        html: menu.innerHTML.trim(),
        buttons: Array.from(menu.querySelectorAll('button')).map(b => ({
          testId: b.getAttribute('data-testid'),
          text: b.textContent?.trim(),
          visible: b.style.display !== 'none' && b.style.visibility !== 'hidden' && !b.hidden
        }))
      };
    });
    console.log('Context menu state:', JSON.stringify(menuButtons, null, 2));
  });

  test('check branch checkbox state after Keep Path Only', async ({ page }) => {
    // Verify checkboxes are unchecked after Keep Path Only
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();
    
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="keep-path-only-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    // Check checkbox states
    await page.waitForTimeout(300);
    
    const checkboxes = await page.evaluate(() => {
      const toggles = document.querySelectorAll('.branch-toggle');
      return Array.from(toggles).map(toggle => {
        const checkbox = toggle.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const label = toggle.querySelector('.branch-name')?.textContent?.trim();
        return {
          branch: label,
          checked: checkbox?.checked,
          disabled: checkbox?.disabled
        };
      });
    });
    console.log('Branch checkbox states:', JSON.stringify(checkboxes, null, 2));
    
    // Now check the checkbox for Marketing
    const marketingCheckbox = page.locator('.branch-toggle').filter({ hasText: 'Marketing' }).getByRole('checkbox');
    const isChecked = await marketingCheckbox.isChecked();
    console.log('Marketing checkbox checked:', isChecked);
    
    // Check it and verify
    await marketingCheckbox.check();
    const isCheckedAfter = await marketingCheckbox.isChecked();
    console.log('Marketing checkbox after check:', isCheckedAfter);
    
    await expect(page.locator('[data-testid="node-Marketing"]')).toBeVisible({ timeout: 5000 });
    console.log('Marketing is now visible after re-checking ✓');
    
    const finalCount = await page.locator('[data-testid^="node-"]').count();
    console.log('Final node count:', finalCount);
  });
});

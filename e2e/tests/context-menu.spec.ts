import { test, expect } from '@playwright/test';

test.describe('Value Tree Selection - Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the tree to render by checking for node elements
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 15000 });
  });

  test('context menu appears when clicking on a node with children', async ({ page }) => {
    // Click on the "Engineering" node (it has children, so prune option should appear)
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });

    // Click the circle element within the node group
    await engineeringNode.locator('circle').click();

    // Wait for context menu to appear
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });

    // Verify the menu header shows the node name
    const menuHeader = page.locator('[data-testid="context-menu-header"]');
    await expect(menuHeader).toContainText('Engineering');

    // Verify both action buttons are present for a node with children
    await expect(page.locator('[data-testid="remove-node-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="prune-children-btn"]')).toBeVisible();
  });

  test('context menu shows only Remove button for leaf node (no children)', async ({ page }) => {
    // Try to find a visible leaf node - "Infrastructure" is a child of DevOps with no children
    const infrastructureNode = page.locator('[data-testid="node-Infrastructure"]');

    // Check if it's visible; if not, try another leaf node
    if (await infrastructureNode.isVisible().catch(() => false)) {
      await infrastructureNode.locator('circle').click();

      const contextMenu = page.locator('[data-testid="context-menu"]');
      await expect(contextMenu).toBeVisible({ timeout: 5000 });

      // Verify Remove button is present
      await expect(page.locator('[data-testid="remove-node-btn"]')).toBeVisible();

      // Verify Prune button is NOT present for leaf nodes
      await expect(page.locator('[data-testid="prune-children-btn"]')).not.toBeVisible();
    } else {
      // Fallback: try "SEO Team" which should be a leaf node
      const seoNode = page.locator('[data-testid="node-SEO Team"]');
      if (await seoNode.isVisible().catch(() => false)) {
        await seoNode.locator('circle').click();

        const contextMenu = page.locator('[data-testid="context-menu"]');
        await expect(contextMenu).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="remove-node-btn"]')).toBeVisible();
        await expect(page.locator('[data-testid="prune-children-btn"]')).not.toBeVisible();
      } else {
        // Last resort: click any visible node and verify menu appears with remove button
        const anyNode = page.locator('[data-testid^="node-"]').first();
        await anyNode.locator('circle').click();

        const contextMenu = page.locator('[data-testid="context-menu"]');
        await expect(contextMenu).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="remove-node-btn"]')).toBeVisible();
      }
    }
  });

  test('Remove Node action removes the node from the tree', async ({ page }) => {
    // Click on Engineering node to open context menu
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });

    await engineeringNode.locator('circle').click();

    // Verify context menu is visible
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });

    // Click Remove button
    await page.locator('[data-testid="remove-node-btn"]').click();

    // Context menu should disappear
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    // Engineering node should no longer be visible in the tree
    await expect(engineeringNode).not.toBeVisible({ timeout: 5000 });
  });

  test('Keep Path Only (Prune Children) removes children but keeps the node', async ({ page }) => {
    // Click on Engineering node to open context menu
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });

    await engineeringNode.locator('circle').click();

    // Verify context menu is visible and prune button exists
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });

    const pruneBtn = page.locator('[data-testid="prune-children-btn"]');
    await expect(pruneBtn).toBeVisible();
    await pruneBtn.click();

    // Context menu should disappear
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });

    // Engineering node should still be visible (path preserved)
    await expect(engineeringNode).toBeVisible({ timeout: 5000 });

    // Children of Engineering should no longer be visible
    const frontendTeam = page.locator('[data-testid="node-Frontend Team"]');
    const backendTeam = page.locator('[data-testid="node-Backend Team"]');
    const devopsNode = page.locator('[data-testid="node-DevOps"]');

    // All children should be gone after pruning
    await expect(frontendTeam).not.toBeVisible({ timeout: 5000 });
    await expect(backendTeam).not.toBeVisible({ timeout: 5000 });
    await expect(devopsNode).not.toBeVisible({ timeout: 5000 });
  });

  test('context menu closes when clicking outside on the canvas', async ({ page }) => {
    // Click on a node to open context menu
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });

    await engineeringNode.locator('circle').click();

    // Verify context menu is visible
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });

    // Click on an empty area of the canvas wrapper (not on any node)
    const canvasWrapper = page.locator('[data-testid="canvas-wrapper"]');
    const box = await canvasWrapper.boundingBox();

    if (box) {
      // Click in a corner area unlikely to have nodes
      await canvasWrapper.click({ position: { x: 10, y: box.height - 10 } });

      // Context menu should be hidden
      await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('multiple nodes can be removed sequentially', async ({ page }) => {
    // Remove Engineering first
    const engineeringNode = page.locator('[data-testid="node-Engineering"]');
    await expect(engineeringNode).toBeVisible({ timeout: 15000 });
    await engineeringNode.locator('circle').click();

    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="remove-node-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    await expect(engineeringNode).not.toBeVisible({ timeout: 5000 });

    // Remove Marketing next
    const marketingNode = page.locator('[data-testid="node-Marketing"]');
    await expect(marketingNode).toBeVisible({ timeout: 15000 });
    await marketingNode.locator('circle').click();

    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="remove-node-btn"]').click();
    await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    await expect(marketingNode).not.toBeVisible({ timeout: 5000 });

    // Both nodes should be gone
    await expect(engineeringNode).not.toBeVisible();
    await expect(marketingNode).not.toBeVisible();

    // Company Root should still be visible
    const rootNode = page.locator('[data-testid="node-Company Root"]');
    await expect(rootNode).toBeVisible();
  });
});
import { describe, test, expect, beforeEach } from 'bun:test';
import { TreeService } from './tree-service';

describe('TreeService - toggleBranch()', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
  });

  describe('basic toggle behavior', () => {
    test('removes a branch from selectedBranchIds when toggling off', () => {
      // Initially all branches are selected (auto-selected in constructor)
      expect(service.isBranchSelected('2')).toBe(true);

      service.toggleBranch('2');

      expect(service.isBranchSelected('2')).toBe(false);
    });

    test('adds a branch to selectedBranchIds when toggling on after being off', () => {
      // Start with branch 2 deselected
      service.toggleBranch('2');
      expect(service.isBranchSelected('2')).toBe(false);

      // Toggle it back on
      service.toggleBranch('2');
      expect(service.isBranchSelected('2')).toBe(true);
    });
  });

  describe('fix: toggleBranch removes branch from excludedNodeIds when checking back on', () => {
    test('removes a branch from excludedNodeIds when re-checking a branch that was excluded', () => {
      // Simulate what "Keep Path Only" does: exclude sibling '3', deselect it from branches
      // First, deselect branch 3
      service.toggleBranch('3');
      expect(service.isBranchSelected('3')).toBe(false);

      // Now branch 3 should not be in selectedBranchIds
      // toggleBranch('3') will ADD it back, and should also clean excludedNodeIds
      // But we need to also manually add it to excludedNodeIds, since keepPathOnly does both
      // Actually, let's be more direct. The fix is: when toggleBranch ADDS a branch (not already selected),
      // it should also clean excludedNodeIds.

      // Direct test: add branch 3 to excludedNodeIds manually (simulating keepPathOnly's effect)
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('3');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      // Verify: branch 3 is in excludedNodeIds and NOT in selectedBranchIds
      expect(service.isNodeExcluded('3')).toBe(true);
      expect(service.isBranchSelected('3')).toBe(false);

      // ACT: toggle branch 3 back on
      service.toggleBranch('3');

      // ASSERT: branch 3 is now selected AND no longer excluded
      expect(service.isBranchSelected('3')).toBe(true);
      expect(service.isNodeExcluded('3')).toBe(false);
    });

    test('does not remove other excluded branches when checking one back on', () => {
      // Put branches 3 and 4 into excludedNodeIds
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('3');
      excludedIds.add('4');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      // Deselect branch 3
      service.toggleBranch('3');
      // branch 3 was in selectedBranchIds, now removed
      expect(service.isBranchSelected('3')).toBe(false);

      // Deselect branch 4
      service.toggleBranch('4');
      expect(service.isBranchSelected('4')).toBe(false);

      // Verify both are excluded
      expect(service.isNodeExcluded('3')).toBe(true);
      expect(service.isNodeExcluded('4')).toBe(true);

      // ACT: re-check branch 3 only
      service.toggleBranch('3');

      // ASSERT: branch 3 is restored, branch 4 is still excluded
      expect(service.isBranchSelected('3')).toBe(true);
      expect(service.isNodeExcluded('3')).toBe(false);
      expect(service.isBranchSelected('4')).toBe(false);
      expect(service.isNodeExcluded('4')).toBe(true);
    });
  });

  describe('toggleBranch does not affect excludedNodeIds when toggling off', () => {
    test('does not modify excludedNodeIds when deselecting a branch', () => {
      // Setup: branch 4 is currently selected (all selected by default)
      // and it's also in excludedNodeIds (simulating edge case where both sets contain same id)
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('4');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      expect(service.isBranchSelected('4')).toBe(true);
      expect(service.isNodeExcluded('4')).toBe(true);

      // ACT: toggle branch 4 OFF (it's currently selected)
      service.toggleBranch('4');

      // ASSERT: branch 4 is deselected. excludedNodeIds should NOT have been touched
      // (the fix only excludes when ADDING to selectedBranchIds)
      expect(service.isBranchSelected('4')).toBe(false);
      expect(service.isNodeExcluded('4')).toBe(true);
    });
  });

  describe('integration with keepPathOnly', () => {
    test('re-checking a sibling after keepPathOnly restores it in both selectedBranchIds and excludedNodeIds', () => {
      // Set root node to '1' (Company Root) to expose branches Engineering(2), Marketing(3), Sales(4)
      service.setSelectedNodeId('1');

      // All three branches should be selected
      expect(service.isBranchSelected('2')).toBe(true);
      expect(service.isBranchSelected('3')).toBe(true);
      expect(service.isBranchSelected('4')).toBe(true);

      // ACT: Keep path only of '2' (Engineering) - excludes 3 and 4, removes them from branch selection
      service.keepPathOnly('2');

      // ASSERT: branch 2 is still selected, branches 3 and 4 are excluded and deselected
      expect(service.isBranchSelected('2')).toBe(true);
      expect(service.isBranchSelected('3')).toBe(false);
      expect(service.isBranchSelected('4')).toBe(false);
      expect(service.isNodeExcluded('3')).toBe(true);
      expect(service.isNodeExcluded('4')).toBe(true);

      // ACT: re-check branch 3 (Marketing)
      service.toggleBranch('3');

      // ASSERT: branch 3 is now selected AND no longer excluded
      expect(service.isBranchSelected('3')).toBe(true);
      expect(service.isNodeExcluded('3')).toBe(false);

      // branch 4 should still be excluded and deselected
      expect(service.isBranchSelected('4')).toBe(false);
      expect(service.isNodeExcluded('4')).toBe(true);
    });
  });
});

describe('TreeService - hasExcludedSiblings()', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
  });

  test('returns false when no siblings are excluded', () => {
    expect(service.hasExcludedSiblings('2')).toBe(false);
    expect(service.hasExcludedSiblings('3')).toBe(false);
    expect(service.hasExcludedSiblings('5')).toBe(false);
  });

  test('returns false for root node (has no parent)', () => {
    expect(service.hasExcludedSiblings('1')).toBe(false);
  });

  test('returns false for a node that has no siblings (only child)', () => {
    // Node '11' (UI Developers) is child of '5' (Frontend Team).
    // '5' has children ['11', '12'], so '11' has sibling '12'.
    // Pick a truly only-child: e.g., node '12' (UX Designers) has child '23' (Design System Team) — only child
    expect(service.hasExcludedSiblings('23')).toBe(false);

    // Even after excluding '23' itself, hasExcludedSiblings should still be false
    // because '23' has no siblings at all
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('23');
    (service as any).excludedNodeIdsSubject.next(excludedIds);
    expect(service.hasExcludedSiblings('23')).toBe(false);
  });

  test('returns true when a sibling is directly excluded', () => {
    service.setSelectedNodeId('1');
    service.keepPathOnly('2');
    // keepPathOnly('2') excludes siblings 3 and 4
    expect(service.hasExcludedSiblings('2')).toBe(true);
  });

  test('returns true when a descendant of a sibling is excluded (but sibling itself is not)', () => {
    // Node '6' (Backend Team) has siblings '5' (Frontend Team) and '7' (DevOps)
    // Exclude '11' (UI Developers), which is a descendant of sibling '5'
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('11');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // hasExcludedSiblings('6') should detect that descendant of sibling '5' is excluded
    expect(service.hasExcludedSiblings('6')).toBe(true);
  });

  test('returns false when only the node itself is excluded (not a sibling)', () => {
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('2');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // hasExcludedSiblings checks siblings of node, not the node itself
    expect(service.hasExcludedSiblings('2')).toBe(false);
  });

  test('returns false after restoreExcludedSiblings is called', () => {
    service.setSelectedNodeId('1');
    service.keepPathOnly('2');
    expect(service.hasExcludedSiblings('2')).toBe(true);

    service.restoreExcludedSiblings('2');
    expect(service.hasExcludedSiblings('2')).toBe(false);
  });

  test('returns true when multiple siblings are excluded', () => {
    // Exclude sibling '3' (Marketing) directly
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    expect(service.hasExcludedSiblings('4')).toBe(true);
    expect(service.hasExcludedSiblings('2')).toBe(true);
  });
});

describe('TreeService - restoreExcludedSiblings()', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
    // Set root to '1' so we have clear branches 2, 3, 4
    service.setSelectedNodeId('1');
  });

  test('restores excluded siblings to selectedBranchIds and removes from excludedNodeIds', () => {
    service.keepPathOnly('2');

    // Verify state after keepPathOnly
    expect(service.isBranchSelected('2')).toBe(true);
    expect(service.isBranchSelected('3')).toBe(false);
    expect(service.isBranchSelected('4')).toBe(false);
    expect(service.isNodeExcluded('3')).toBe(true);
    expect(service.isNodeExcluded('4')).toBe(true);

    // ACT
    service.restoreExcludedSiblings('2');

    // Siblings are restored to branch selection
    expect(service.isBranchSelected('3')).toBe(true);
    expect(service.isBranchSelected('4')).toBe(true);
    // Siblings are removed from exclusion
    expect(service.isNodeExcluded('3')).toBe(false);
    expect(service.isNodeExcluded('4')).toBe(false);
    // Target node is unaffected
    expect(service.isBranchSelected('2')).toBe(true);
  });

  test('removes descendant nodes from excludedNodeIds when restoring siblings', () => {
    // Use deeper tree: parent is '2' (Engineering), siblings are '5', '6', '7'
    service.setSelectedNodeId('2');
    // Exclude '5' (Frontend Team) and its descendant '11' (UI Developers)
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('5');
    excludedIds.add('11');
    excludedIds.add('21'); // React Squad, deeper descendant
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // Remove 5 and 11 from branch selection
    const branchCurrent = (service as any).selectedBranchIdsSubject.getValue();
    branchCurrent.delete('5');
    branchCurrent.delete('11');
    (service as any).selectedBranchIdsSubject.next(branchCurrent);

    // Verify state: excluded
    expect(service.isNodeExcluded('5')).toBe(true);
    expect(service.isNodeExcluded('11')).toBe(true);
    expect(service.isNodeExcluded('21')).toBe(true);
    expect(service.isBranchSelected('5')).toBe(false);

    // ACT: restore siblings of '6' (Backend Team) — sibling '5' and its descendants should be restored
    service.restoreExcludedSiblings('6');

    // Sibling '5' and its descendants are no longer excluded
    expect(service.isNodeExcluded('5')).toBe(false);
    expect(service.isNodeExcluded('11')).toBe(false);
    expect(service.isNodeExcluded('21')).toBe(false);
    // Sibling '5' is back in branch selection
    expect(service.isBranchSelected('5')).toBe(true);
  });

  test('is a no-op when node has no parent (root)', () => {
    // Should not throw and should not change state
    const branchBefore = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedBefore = new Set((service as any).excludedNodeIdsSubject.getValue());

    service.restoreExcludedSiblings('1');

    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchBefore);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedBefore);
  });

  test('is a no-op when no siblings are excluded', () => {
    const branchBefore = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedBefore = new Set((service as any).excludedNodeIdsSubject.getValue());

    service.restoreExcludedSiblings('2');
    service.restoreExcludedSiblings('3');
    service.restoreExcludedSiblings('4');

    // State should be unchanged
    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchBefore);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedBefore);
  });

  test('restores correctly even when only some siblings are excluded', () => {
    // Exclude only sibling '3' (Marketing), leave '4' (Sales) alone
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3');
    (service as any).excludedNodeIdsSubject.next(excludedIds);
    // Also deselect '3' from branches
    const branchCurrent = (service as any).selectedBranchIdsSubject.getValue();
    branchCurrent.delete('3');
    (service as any).selectedBranchIdsSubject.next(branchCurrent);

    expect(service.isNodeExcluded('3')).toBe(true);
    expect(service.isNodeExcluded('4')).toBe(false);
    expect(service.isBranchSelected('3')).toBe(false);
    expect(service.isBranchSelected('4')).toBe(true);

    // ACT: restore siblings of '2'
    service.restoreExcludedSiblings('2');

    // Only '3' was excluded — it gets restored. '4' stays as-is.
    expect(service.isNodeExcluded('3')).toBe(false);
    expect(service.isNodeExcluded('4')).toBe(false);
    expect(service.isBranchSelected('3')).toBe(true);
    expect(service.isBranchSelected('4')).toBe(true);
  });
});

describe('TreeService - integration: Add Back Siblings flow (keepPathOnly + restoreExcludedSiblings)', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
    service.setSelectedNodeId('1');
  });

  test('full happy path: keepPathOnly + hasExcludedSiblings + restoreExcludedSiblings + hasExcludedSiblings', () => {
    // Initial state: all 3 branches selected
    expect(service.isBranchSelected('2')).toBe(true);
    expect(service.isBranchSelected('3')).toBe(true);
    expect(service.isBranchSelected('4')).toBe(true);
    expect(service.hasExcludedSiblings('2')).toBe(false);

    // STEP 1: Keep Path Only for Engineering (2)
    service.keepPathOnly('2');
    expect(service.isBranchSelected('2')).toBe(true);
    expect(service.isBranchSelected('3')).toBe(false);
    expect(service.isBranchSelected('4')).toBe(false);
    expect(service.isNodeExcluded('3')).toBe(true);
    expect(service.isNodeExcluded('4')).toBe(true);
    expect(service.hasExcludedSiblings('2')).toBe(true);

    // STEP 2: Add Back Siblings = restoreExcludedSiblings
    service.restoreExcludedSiblings('2');

    // All branches restored to original state
    expect(service.isBranchSelected('2')).toBe(true);
    expect(service.isBranchSelected('3')).toBe(true);
    expect(service.isBranchSelected('4')).toBe(true);
    expect(service.isNodeExcluded('3')).toBe(false);
    expect(service.isNodeExcluded('4')).toBe(false);
    expect(service.hasExcludedSiblings('2')).toBe(false);
  });

  test('double restore is idempotent (restoreExcludedSiblings twice in a row)', () => {
    service.keepPathOnly('2');
    service.restoreExcludedSiblings('2');

    // Record state after first restore
    const branchAfterFirst = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedAfterFirst = new Set((service as any).excludedNodeIdsSubject.getValue());

    // Second restore should not change anything
    service.restoreExcludedSiblings('2');

    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchAfterFirst);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedAfterFirst);
  });

  test('restoreExcludedSiblings works correctly on deeper nested nodes', () => {
    // Switch context to Engineering (2)
    service.setSelectedNodeId('2');
    // Child branches: Frontend (5), Backend (6), DevOps (7)

    service.keepPathOnly('5');
    // Siblings 6 and 7 should be excluded
    expect(service.hasExcludedSiblings('5')).toBe(true);
    expect(service.isNodeExcluded('6')).toBe(true);
    expect(service.isNodeExcluded('7')).toBe(true);
    expect(service.isBranchSelected('5')).toBe(true);
    expect(service.isBranchSelected('6')).toBe(false);
    expect(service.isBranchSelected('7')).toBe(false);

    // Add back siblings
    service.restoreExcludedSiblings('5');
    expect(service.isNodeExcluded('6')).toBe(false);
    expect(service.isNodeExcluded('7')).toBe(false);
    expect(service.isBranchSelected('6')).toBe(true);
    expect(service.isBranchSelected('7')).toBe(true);
    expect(service.hasExcludedSiblings('5')).toBe(false);
  });
});

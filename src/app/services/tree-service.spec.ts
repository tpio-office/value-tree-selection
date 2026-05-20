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
      expect(service.isBranchSelected('3366')).toBe(true);

      service.toggleBranch('3366');

      expect(service.isBranchSelected('3366')).toBe(false);
    });

    test('adds a branch to selectedBranchIds when toggling on after being off', () => {
      // Start with branch 3366 deselected
      service.toggleBranch('3366');
      expect(service.isBranchSelected('3366')).toBe(false);

      // Toggle it back on
      service.toggleBranch('3366');
      expect(service.isBranchSelected('3366')).toBe(true);
    });
  });

  describe('fix: toggleBranch removes branch from excludedNodeIds when checking back on', () => {
    test('removes a branch from excludedNodeIds when re-checking a branch that was excluded', () => {
      // Simulate what "Keep Path Only" does: exclude sibling '3409', deselect it from branches
      // First, deselect branch 3409
      service.toggleBranch('3409');
      expect(service.isBranchSelected('3409')).toBe(false);

      // Now branch 3409 should not be in selectedBranchIds
      // toggleBranch('3409') will ADD it back, and should also clean excludedNodeIds
      // But we need to also manually add it to excludedNodeIds, since keepPathOnly does both
      // Actually, let's be more direct. The fix is: when toggleBranch ADDS a branch (not already selected),
      // it should also clean excludedNodeIds.

      // Direct test: add branch 3409 to excludedNodeIds manually (simulating keepPathOnly's effect)
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('3409');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      // Verify: branch 3409 is in excludedNodeIds and NOT in selectedBranchIds
      expect(service.isNodeExcluded('3409')).toBe(true);
      expect(service.isBranchSelected('3409')).toBe(false);

      // ACT: toggle branch 3409 back on
      service.toggleBranch('3409');

      // ASSERT: branch 3409 is now selected AND no longer excluded
      expect(service.isBranchSelected('3409')).toBe(true);
      expect(service.isNodeExcluded('3409')).toBe(false);
    });

    test('does not remove other excluded branches when checking one back on', () => {
      // Put branches 3409 and 3538 into excludedNodeIds
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('3409');
      excludedIds.add('3538');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      // Deselect branch 3409
      service.toggleBranch('3409');
      // branch 3409 was in selectedBranchIds, now removed
      expect(service.isBranchSelected('3409')).toBe(false);

      // Deselect branch 3538
      service.toggleBranch('3538');
      expect(service.isBranchSelected('3538')).toBe(false);

      // Verify both are excluded
      expect(service.isNodeExcluded('3409')).toBe(true);
      expect(service.isNodeExcluded('3538')).toBe(true);

      // ACT: re-check branch 3409 only
      service.toggleBranch('3409');

      // ASSERT: branch 3409 is restored, branch 3538 is still excluded
      expect(service.isBranchSelected('3409')).toBe(true);
      expect(service.isNodeExcluded('3409')).toBe(false);
      expect(service.isBranchSelected('3538')).toBe(false);
      expect(service.isNodeExcluded('3538')).toBe(true);
    });
  });

  describe('toggleBranch does not affect excludedNodeIds when toggling off', () => {
    test('does not modify excludedNodeIds when deselecting a branch', () => {
      // Setup: branch 3538 is currently selected (all selected by default)
      // and it's also in excludedNodeIds (simulating edge case where both sets contain same id)
      const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
      excludedIds.add('3538');
      (service as any).excludedNodeIdsSubject.next(excludedIds);

      expect(service.isBranchSelected('3538')).toBe(true);
      expect(service.isNodeExcluded('3538')).toBe(true);

      // ACT: toggle branch 3538 OFF (it's currently selected)
      service.toggleBranch('3538');

      // ASSERT: branch 3538 is deselected. excludedNodeIds should NOT have been touched
      // (the fix only excludes when ADDING to selectedBranchIds)
      expect(service.isBranchSelected('3538')).toBe(false);
      expect(service.isNodeExcluded('3538')).toBe(true);
    });
  });

  describe('integration with keepPathOnly', () => {
    test('re-checking a sibling after keepPathOnly restores it in both selectedBranchIds and excludedNodeIds', () => {
      // Set root node to '3365' (NOSIA-2-2 Highest Node) to expose branches LTEM Ready Nation(3366), Healthy Oceans(3409), Resilient Coastal Communities and Economies(3538)
      service.setSelectedNodeId('3365');

      // All three branches should be selected
      expect(service.isBranchSelected('3366')).toBe(true);
      expect(service.isBranchSelected('3409')).toBe(true);
      expect(service.isBranchSelected('3538')).toBe(true);

      // ACT: Keep path only of '3366' (LTEM Ready Nation) - excludes 3409 and 3538, removes them from branch selection
      service.keepPathOnly('3366');

      // ASSERT: branch 3366 is still selected, branches 3409 and 3538 are excluded and deselected
      expect(service.isBranchSelected('3366')).toBe(true);
      expect(service.isBranchSelected('3409')).toBe(false);
      expect(service.isBranchSelected('3538')).toBe(false);
      expect(service.isNodeExcluded('3409')).toBe(true);
      expect(service.isNodeExcluded('3538')).toBe(true);

      // ACT: re-check branch 3409 (Healthy Oceans)
      service.toggleBranch('3409');

      // ASSERT: branch 3409 is now selected AND no longer excluded
      expect(service.isBranchSelected('3409')).toBe(true);
      expect(service.isNodeExcluded('3409')).toBe(false);

      // branch 3538 should still be excluded and deselected
      expect(service.isBranchSelected('3538')).toBe(false);
      expect(service.isNodeExcluded('3538')).toBe(true);
    });
  });
});

describe('TreeService - hasExcludedSiblings()', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
  });

  test('returns false when no siblings are excluded', () => {
    expect(service.hasExcludedSiblings('3366')).toBe(false);
    expect(service.hasExcludedSiblings('3409')).toBe(false);
    expect(service.hasExcludedSiblings('3367')).toBe(false);
  });

  test('returns false for root node (has no parent)', () => {
    expect(service.hasExcludedSiblings('3365')).toBe(false);
  });

  test('returns false for a node that has no siblings (only child)', () => {
    // Node '3368' (Data and Metadata Stewardship_N2-2) is child of '3367' (Authoritative Observations...).
    // '3367' has children ['3368', '3370'], so '3368' has sibling '3370'.
    // Pick a truly only-child: e.g., node '3370' (LTEM Monitoring...) has child '3371' — only child
    expect(service.hasExcludedSiblings('3371')).toBe(false);

    // Even after excluding '3371' itself, hasExcludedSiblings should still be false
    // because '3371' has no siblings at all
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3371');
    (service as any).excludedNodeIdsSubject.next(excludedIds);
    expect(service.hasExcludedSiblings('3371')).toBe(false);
  });

  test('returns true when a sibling is directly excluded', () => {
    service.setSelectedNodeId('3365');
    service.keepPathOnly('3366');
    // keepPathOnly('3366') excludes siblings 3409 and 3538
    expect(service.hasExcludedSiblings('3366')).toBe(true);
  });

  test('returns true when a descendant of a sibling is excluded (but sibling itself is not)', () => {
    // Node '3376' (LTEM Research) has siblings '3367' (Authoritative Observations...) and '3385' (Environmental Predictions...)
    // Exclude '3368' (Data and Metadata Stewardship_N2-2), which is a descendant of sibling '3367'
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3368');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // hasExcludedSiblings('3376') should detect that descendant of sibling '3367' is excluded
    expect(service.hasExcludedSiblings('3376')).toBe(true);
  });

  test('returns false when only the node itself is excluded (not a sibling)', () => {
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3366');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // hasExcludedSiblings checks siblings of node, not the node itself
    expect(service.hasExcludedSiblings('3366')).toBe(false);
  });

  test('returns false after restoreExcludedSiblings is called', () => {
    service.setSelectedNodeId('3365');
    service.keepPathOnly('3366');
    expect(service.hasExcludedSiblings('3366')).toBe(true);

    service.restoreExcludedSiblings('3366');
    expect(service.hasExcludedSiblings('3366')).toBe(false);
  });

  test('returns true when multiple siblings are excluded', () => {
    // Exclude sibling '3409' (Healthy Oceans) directly
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3409');
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    expect(service.hasExcludedSiblings('3538')).toBe(true);
    expect(service.hasExcludedSiblings('3366')).toBe(true);
  });
});

describe('TreeService - restoreExcludedSiblings()', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
    // Set root to '3365' so we have clear branches 3366, 3409, 3538
    service.setSelectedNodeId('3365');
  });

  test('restores excluded siblings to selectedBranchIds and removes from excludedNodeIds', () => {
    service.keepPathOnly('3366');

    // Verify state after keepPathOnly
    expect(service.isBranchSelected('3366')).toBe(true);
    expect(service.isBranchSelected('3409')).toBe(false);
    expect(service.isBranchSelected('3538')).toBe(false);
    expect(service.isNodeExcluded('3409')).toBe(true);
    expect(service.isNodeExcluded('3538')).toBe(true);

    // ACT
    service.restoreExcludedSiblings('3366');

    // Siblings are restored to branch selection
    expect(service.isBranchSelected('3409')).toBe(true);
    expect(service.isBranchSelected('3538')).toBe(true);
    // Siblings are removed from exclusion
    expect(service.isNodeExcluded('3409')).toBe(false);
    expect(service.isNodeExcluded('3538')).toBe(false);
    // Target node is unaffected
    expect(service.isBranchSelected('3366')).toBe(true);
  });

  test('removes descendant nodes from excludedNodeIds when restoring siblings', () => {
    // Use deeper tree: parent is '3366' (LTEM Ready Nation), siblings are '3367', '3376', '3385'
    service.setSelectedNodeId('3366');
    // Exclude '3367' (Authoritative Observations...) and its descendant '3368' (Data and Metadata Stewardship_N2-2)
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3367');
    excludedIds.add('3368');
    excludedIds.add('3369'); // deeper descendant
    (service as any).excludedNodeIdsSubject.next(excludedIds);

    // Remove 3367 and 3368 from branch selection
    const branchCurrent = (service as any).selectedBranchIdsSubject.getValue();
    branchCurrent.delete('3367');
    branchCurrent.delete('3368');
    (service as any).selectedBranchIdsSubject.next(branchCurrent);

    // Verify state: excluded
    expect(service.isNodeExcluded('3367')).toBe(true);
    expect(service.isNodeExcluded('3368')).toBe(true);
    expect(service.isNodeExcluded('3369')).toBe(true);
    expect(service.isBranchSelected('3367')).toBe(false);

    // ACT: restore siblings of '3376' (LTEM Research) — sibling '3367' and its descendants should be restored
    service.restoreExcludedSiblings('3376');

    // Sibling '3367' and its descendants are no longer excluded
    expect(service.isNodeExcluded('3367')).toBe(false);
    expect(service.isNodeExcluded('3368')).toBe(false);
    expect(service.isNodeExcluded('3369')).toBe(false);
    // Sibling '3367' is back in branch selection
    expect(service.isBranchSelected('3367')).toBe(true);
  });

  test('is a no-op when node has no parent (root)', () => {
    // Should not throw and should not change state
    const branchBefore = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedBefore = new Set((service as any).excludedNodeIdsSubject.getValue());

    service.restoreExcludedSiblings('3365');

    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchBefore);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedBefore);
  });

  test('is a no-op when no siblings are excluded', () => {
    const branchBefore = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedBefore = new Set((service as any).excludedNodeIdsSubject.getValue());

    service.restoreExcludedSiblings('3366');
    service.restoreExcludedSiblings('3409');
    service.restoreExcludedSiblings('3538');

    // State should be unchanged
    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchBefore);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedBefore);
  });

  test('restores correctly even when only some siblings are excluded', () => {
    // Exclude only sibling '3409' (Healthy Oceans), leave '3538' (Resilient Coastal Communities and Economies) alone
    const excludedIds = (service as any).excludedNodeIdsSubject.getValue();
    excludedIds.add('3409');
    (service as any).excludedNodeIdsSubject.next(excludedIds);
    // Also deselect '3409' from branches
    const branchCurrent = (service as any).selectedBranchIdsSubject.getValue();
    branchCurrent.delete('3409');
    (service as any).selectedBranchIdsSubject.next(branchCurrent);

    expect(service.isNodeExcluded('3409')).toBe(true);
    expect(service.isNodeExcluded('3538')).toBe(false);
    expect(service.isBranchSelected('3409')).toBe(false);
    expect(service.isBranchSelected('3538')).toBe(true);

    // ACT: restore siblings of '3366'
    service.restoreExcludedSiblings('3366');

    // Only '3409' was excluded — it gets restored. '3538' stays as-is.
    expect(service.isNodeExcluded('3409')).toBe(false);
    expect(service.isNodeExcluded('3538')).toBe(false);
    expect(service.isBranchSelected('3409')).toBe(true);
    expect(service.isBranchSelected('3538')).toBe(true);
  });
});

describe('TreeService - integration: Add Back Siblings flow (keepPathOnly + restoreExcludedSiblings)', () => {
  let service: TreeService;

  beforeEach(() => {
    service = new TreeService();
    service.setSelectedNodeId('3365');
  });

  test('full happy path: keepPathOnly + hasExcludedSiblings + restoreExcludedSiblings + hasExcludedSiblings', () => {
    // Initial state: all 3 branches selected
    expect(service.isBranchSelected('3366')).toBe(true);
    expect(service.isBranchSelected('3409')).toBe(true);
    expect(service.isBranchSelected('3538')).toBe(true);
    expect(service.hasExcludedSiblings('3366')).toBe(false);

    // STEP 1: Keep Path Only for LTEM Ready Nation (3366)
    service.keepPathOnly('3366');
    expect(service.isBranchSelected('3366')).toBe(true);
    expect(service.isBranchSelected('3409')).toBe(false);
    expect(service.isBranchSelected('3538')).toBe(false);
    expect(service.isNodeExcluded('3409')).toBe(true);
    expect(service.isNodeExcluded('3538')).toBe(true);
    expect(service.hasExcludedSiblings('3366')).toBe(true);

    // STEP 2: Add Back Siblings = restoreExcludedSiblings
    service.restoreExcludedSiblings('3366');

    // All branches restored to original state
    expect(service.isBranchSelected('3366')).toBe(true);
    expect(service.isBranchSelected('3409')).toBe(true);
    expect(service.isBranchSelected('3538')).toBe(true);
    expect(service.isNodeExcluded('3409')).toBe(false);
    expect(service.isNodeExcluded('3538')).toBe(false);
    expect(service.hasExcludedSiblings('3366')).toBe(false);
  });

  test('double restore is idempotent (restoreExcludedSiblings twice in a row)', () => {
    service.keepPathOnly('3366');
    service.restoreExcludedSiblings('3366');

    // Record state after first restore
    const branchAfterFirst = new Set((service as any).selectedBranchIdsSubject.getValue());
    const excludedAfterFirst = new Set((service as any).excludedNodeIdsSubject.getValue());

    // Second restore should not change anything
    service.restoreExcludedSiblings('3366');

    expect((service as any).selectedBranchIdsSubject.getValue()).toEqual(branchAfterFirst);
    expect((service as any).excludedNodeIdsSubject.getValue()).toEqual(excludedAfterFirst);
  });

  test('restoreExcludedSiblings works correctly on deeper nested nodes', () => {
    // Switch context to LTEM Ready Nation (3366)
    service.setSelectedNodeId('3366');
    // Child branches: Authoritative Observations (3367), LTEM Research (3376), Environmental Predictions (3385)

    service.keepPathOnly('3367');
    // Siblings 3376 and 3385 should be excluded
    expect(service.hasExcludedSiblings('3367')).toBe(true);
    expect(service.isNodeExcluded('3376')).toBe(true);
    expect(service.isNodeExcluded('3385')).toBe(true);
    expect(service.isBranchSelected('3367')).toBe(true);
    expect(service.isBranchSelected('3376')).toBe(false);
    expect(service.isBranchSelected('3385')).toBe(false);

    // Add back siblings
    service.restoreExcludedSiblings('3367');
    expect(service.isNodeExcluded('3376')).toBe(false);
    expect(service.isNodeExcluded('3385')).toBe(false);
    expect(service.isBranchSelected('3376')).toBe(true);
    expect(service.isBranchSelected('3385')).toBe(true);
    expect(service.hasExcludedSiblings('3367')).toBe(false);
  });
});

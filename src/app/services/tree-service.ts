import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TreeNode, FlatNode } from '../models/tree-node';
import { sampleTreeData } from '../data/sample-data';

export interface BranchInfo {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeService {
  private readonly rawData: TreeNode = sampleTreeData;

  // State subjects
  private readonly selectedNodeIdSubject = new BehaviorSubject<string>('1');
  private readonly maxDepthSubject = new BehaviorSubject<number>(5);
  private readonly hiddenLevelsSubject = new BehaviorSubject<Set<number>>(new Set());
  private readonly selectedBranchIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  private readonly excludedNodeIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  private readonly exclusiveNodeIdsSubject = new BehaviorSubject<Set<string>>(new Set());

  // Computed data subject - broadcast filtered tree to components
  private readonly filteredTreeSubject = new BehaviorSubject<TreeNode | null>(null);

  // All nodes flattened for search dropdown
  private readonly allNodesSubject = new BehaviorSubject<FlatNode[]>([]);

  // Available branches (direct children of selected node)
  private readonly availableBranchesSubject = new BehaviorSubject<BranchInfo[]>([]);

  // Observables for components to subscribe to
  public selectedNodeId$ = this.selectedNodeIdSubject.asObservable();
  public maxDepth$ = this.maxDepthSubject.asObservable();
  public hiddenLevels$ = this.hiddenLevelsSubject.asObservable();
  public filteredTree$ = this.filteredTreeSubject.asObservable();
  public allNodes$ = this.allNodesSubject.asObservable();
  public selectedBranchIds$ = this.selectedBranchIdsSubject.asObservable();
  public availableBranches$ = this.availableBranchesSubject.asObservable();
  public excludedNodeIds$ = this.excludedNodeIdsSubject.asObservable();
  public exclusiveNodeIds$ = this.exclusiveNodeIdsSubject.asObservable();

  constructor() {
    this.initializeData();
  }

  // Initialize the service with raw data
  private initializeData(): void {
    const flatNodes = this.flattenTree(this.rawData, 0);
    this.allNodesSubject.next(flatNodes);
    this.updateFilteredTree();
    this.updateAvailableBranches();
  }

  // Flatten tree to get all nodes for search functionality
  private flattenTree(node: TreeNode, depth: number): FlatNode[] {
    const result: FlatNode[] = [{ id: node.id, name: node.name, depth }];
    if (node.children) {
      for (const child of node.children) {
        result.push(...this.flattenTree(child, depth + 1));
      }
    }
    return result;
  }

  // Find a node by ID in the raw tree using DFS
  private findNode(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  // Find the parent of a node by ID using DFS, returns null if root or not found
  private findParent(node: TreeNode, childId: string): TreeNode | null {
    if (!node.children) {
      return null;
    }
    for (const child of node.children) {
      if (child.id === childId) {
        return node;
      }
      const found = this.findParent(child, childId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  // Collect all descendant IDs of a node in the raw tree
  private collectDescendantIds(node: TreeNode): Set<string> {
    const ids = new Set<string>();
    if (node.children) {
      for (const child of node.children) {
        ids.add(child.id);
        const childDescendants = this.collectDescendantIds(child);
        childDescendants.forEach(id => ids.add(id));
      }
    }
    return ids;
  }

  // Extract subtree with BFS/DFS limited to maxDepth generations below selected node
  // Respects: branch selection, excluded nodes, and exclusive (pruned) nodes
  private extractSubtree(node: TreeNode, maxDepth: number, currentDepth: number = 0): TreeNode | null {
    const excludedIds = this.excludedNodeIdsSubject.getValue();
    const exclusiveIds = this.exclusiveNodeIdsSubject.getValue();

    // If this node is excluded, remove it entirely (return null so parent filters it out)
    if (excludedIds.has(node.id)) {
      return null;
    }

    // If this node is marked as exclusive (keep path only), prune all children
    if (exclusiveIds.has(node.id)) {
      return { id: node.id, name: node.name };
    }

    if (currentDepth >= maxDepth || !node.children || node.children.length === 0) {
      return { id: node.id, name: node.name };
    }

    const selectedBranchIds = this.selectedBranchIdsSubject.getValue();
    let children = node.children;

    // If branch selection is active and we're at depth 0 (direct children of root), filter by selection
    if (currentDepth === 0 && selectedBranchIds.size > 0) {
      children = children.filter(child => selectedBranchIds.has(child.id));
    }

    const mappedChildren: TreeNode[] = [];
    for (const child of children) {
      const extracted = this.extractSubtree(child, maxDepth, currentDepth + 1);
      if (extracted) {
        mappedChildren.push(extracted);
      }
    }

    return {
      id: node.id,
      name: node.name,
      children: mappedChildren.length > 0 ? mappedChildren : undefined
    };
  }

  // Update the filtered tree based on current selection and depth
  private updateFilteredTree(): void {
    const selectedId = this.selectedNodeIdSubject.getValue();
    const maxDepth = this.maxDepthSubject.getValue();

    const selectedNode = this.findNode(this.rawData, selectedId);
    if (selectedNode) {
      const filteredTree = this.extractSubtree(selectedNode, maxDepth);
      this.filteredTreeSubject.next(filteredTree);
    } else {
      this.filteredTreeSubject.next(null);
    }
  }

  // Update available branches based on selected node
  private updateAvailableBranches(): void {
    const selectedId = this.selectedNodeIdSubject.getValue();
    const selectedNode = this.findNode(this.rawData, selectedId);

    if (selectedNode && selectedNode.children && selectedNode.children.length > 0) {
      const branches: BranchInfo[] = selectedNode.children.map(child => ({
        id: child.id,
        name: child.name
      }));
      this.availableBranchesSubject.next(branches);

      // Auto-select all branches when changing root node
      const allBranchIds = new Set(branches.map(b => b.id));
      this.selectedBranchIdsSubject.next(allBranchIds);
    } else {
      this.availableBranchesSubject.next([]);
      this.selectedBranchIdsSubject.next(new Set());
    }
  }

  // Set the selected root node
  public setSelectedNodeId(id: string): void {
    this.selectedNodeIdSubject.next(id);
    this.updateFilteredTree();
    this.updateAvailableBranches();
  }

  // Set the maximum depth
  public setMaxDepth(depth: number): void {
    this.maxDepthSubject.next(depth);
    this.updateFilteredTree();
  }

  // Toggle level visibility
  public toggleLevel(level: number): void {
    const current = new Set(this.hiddenLevelsSubject.getValue());
    if (current.has(level)) {
      current.delete(level);
    } else {
      current.add(level);
    }
    this.hiddenLevelsSubject.next(current);
  }

  // Check if a level is hidden
  public isLevelHidden(level: number): boolean {
    return this.hiddenLevelsSubject.getValue().has(level);
  }

  // Toggle branch selection
  public toggleBranch(branchId: string): void {
    const current = new Set(this.selectedBranchIdsSubject.getValue());
    if (current.has(branchId)) {
      current.delete(branchId);
    } else {
      current.add(branchId);
    }
    this.selectedBranchIdsSubject.next(current);
    this.updateFilteredTree();
  }

  // Select all branches
  public selectAllBranches(): void {
    const branches = this.availableBranchesSubject.getValue();
    const allIds = new Set(branches.map(b => b.id));
    this.selectedBranchIdsSubject.next(allIds);
    this.updateFilteredTree();
  }

  // Deselect all branches
  public deselectAllBranches(): void {
    this.selectedBranchIdsSubject.next(new Set());
    this.updateFilteredTree();
  }

  // Check if a branch is selected
  public isBranchSelected(branchId: string): boolean {
    return this.selectedBranchIdsSubject.getValue().has(branchId);
  }

  // Remove a node entirely from the tree (excludes it and all descendants)
  public excludeNode(nodeId: string): void {
    const current = new Set(this.excludedNodeIdsSubject.getValue());
    current.add(nodeId);
    this.excludedNodeIdsSubject.next(current);

    // Also remove from exclusive set if present
    const exclusiveCurrent = new Set(this.exclusiveNodeIdsSubject.getValue());
    exclusiveCurrent.delete(nodeId);
    this.exclusiveNodeIdsSubject.next(exclusiveCurrent);

    // Remove from branch selection if it was a branch
    const branchCurrent = new Set(this.selectedBranchIdsSubject.getValue());
    branchCurrent.delete(nodeId);
    this.selectedBranchIdsSubject.next(branchCurrent);

    this.updateFilteredTree();
  }

  // Keep path only: exclude all siblings of the given node, keeping only that node and its descendants
  public keepPathOnly(nodeId: string): void {
    const parent = this.findParent(this.rawData, nodeId);

    if (parent && parent.children) {
      // Exclude all siblings (children of the same parent except the target node)
      const excludedCurrent = new Set(this.excludedNodeIdsSubject.getValue());
      for (const child of parent.children) {
        if (child.id !== nodeId) {
          excludedCurrent.add(child.id);
        }
      }
      this.excludedNodeIdsSubject.next(excludedCurrent);

      // Remove from exclusive set if present
      const exclusiveCurrent = new Set(this.exclusiveNodeIdsSubject.getValue());
      exclusiveCurrent.delete(nodeId);
      this.exclusiveNodeIdsSubject.next(exclusiveCurrent);

      // Also update branch selection: remove excluded siblings from selected branches
      const branchCurrent = new Set(this.selectedBranchIdsSubject.getValue());
      for (const child of parent.children) {
        if (child.id !== nodeId) {
          branchCurrent.delete(child.id);
        }
      }
      this.selectedBranchIdsSubject.next(branchCurrent);
    }

    this.updateFilteredTree();
  }

  // Check if a node is excluded
  public isNodeExcluded(nodeId: string): boolean {
    return this.excludedNodeIdsSubject.getValue().has(nodeId);
  }

  // Check if a node is marked as exclusive (pruned)
  public isNodeExclusive(nodeId: string): boolean {
    return this.exclusiveNodeIdsSubject.getValue().has(nodeId);
  }

  // Check if a node has siblings in the raw tree
  public hasSiblings(nodeId: string): boolean {
    const parent = this.findParent(this.rawData, nodeId);
    if (!parent || !parent.children) {
      return false;
    }
    return parent.children.length > 1;
  }

  // Get the maximum depth available in the tree from the selected node
  public getMaxAvailableDepth(): number {
    const selectedId = this.selectedNodeIdSubject.getValue();
    const selectedNode = this.findNode(this.rawData, selectedId);
    if (!selectedNode) return 0;
    return this.calculateMaxDepth(selectedNode);
  }

  // Calculate max depth from a node recursively
  private calculateMaxDepth(node: TreeNode): number {
    if (!node.children || node.children.length === 0) {
      return 0;
    }
    let maxChildDepth = 0;
    for (const child of node.children!) {
      const depth = this.calculateMaxDepth(child);
      if (depth > maxChildDepth) {
        maxChildDepth = depth;
      }
    }
    return maxChildDepth + 1;
  }

  // Get current filtered tree for export
  public getExportData(): TreeNode | null {
    return this.filteredTreeSubject.getValue();
  }

  // Export filtered tree as JSON file download
  public exportToJson(): void {
    const data = this.getExportData();
    if (!data) return;

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered-tree.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get all nodes for the dropdown
  public getAllNodes(): FlatNode[] {
    return this.allNodesSubject.getValue();
  }

  // Get available branches
  public getAvailableBranches(): BranchInfo[] {
    return this.availableBranchesSubject.getValue();
  }
}
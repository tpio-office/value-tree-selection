import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FlatNode } from '../../models/tree-node';
import { TreeService, BranchInfo } from '../../services/tree-service';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-panel.html',
  styleUrls: ['./control-panel.scss']
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  allNodes: FlatNode[] = [];
  selectedNodeId: string = '1';
  maxDepth: number = 5;
  hiddenLevels: Set<number> = new Set();
  maxAvailableDepth: number = 0;
  availableLevels: number[] = [];
  availableBranches: BranchInfo[] = [];
  selectedBranchIds: Set<string> = new Set();

  constructor(private treeService: TreeService) {}

  ngOnInit(): void {
    // Subscribe to all nodes
    const nodesSub = this.treeService.allNodes$.subscribe(nodes => {
      this.allNodes = nodes;
    });

    // Subscribe to selected node ID
    const selectedNodeSub = this.treeService.selectedNodeId$.subscribe(id => {
      this.selectedNodeId = id;
      this.updateAvailableLevels();
    });

    // Subscribe to max depth
    const maxDepthSub = this.treeService.maxDepth$.subscribe(depth => {
      this.maxDepth = depth;
      this.updateAvailableLevels();
    });

    // Subscribe to hidden levels
    const hiddenLevelsSub = this.treeService.hiddenLevels$.subscribe(levels => {
      this.hiddenLevels = new Set(levels);
    });

    // Subscribe to available branches
    const branchesSub = this.treeService.availableBranches$.subscribe(branches => {
      this.availableBranches = branches;
    });

    // Subscribe to selected branch IDs
    const selectedBranchesSub = this.treeService.selectedBranchIds$.subscribe(ids => {
      this.selectedBranchIds = new Set(ids);
    });

    this.subscriptions.add(nodesSub);
    this.subscriptions.add(selectedNodeSub);
    this.subscriptions.add(maxDepthSub);
    this.subscriptions.add(hiddenLevelsSub);
    this.subscriptions.add(branchesSub);
    this.subscriptions.add(selectedBranchesSub);

    // Initial setup
    this.maxAvailableDepth = this.treeService.getMaxAvailableDepth();
    this.updateAvailableLevels();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateAvailableLevels(): void {
    const maxDepth = Math.min(this.maxDepth, this.maxAvailableDepth);
    this.availableLevels = Array.from({ length: maxDepth + 1 }, (_, i) => i);
  }

  onNodeSelected(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.treeService.setSelectedNodeId(value);
    this.maxAvailableDepth = this.treeService.getMaxAvailableDepth();
    if (this.maxDepth > this.maxAvailableDepth) {
      this.treeService.setMaxDepth(this.maxAvailableDepth);
    }
  }

  onDepthChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.treeService.setMaxDepth(value);
  }

  toggleLevel(level: number): void {
    this.treeService.toggleLevel(level);
  }

  toggleBranch(branchId: string): void {
    this.treeService.toggleBranch(branchId);
  }

  selectAllBranches(): void {
    this.treeService.selectAllBranches();
  }

  deselectAllBranches(): void {
    this.treeService.deselectAllBranches();
  }

  isBranchSelected(branchId: string): boolean {
    return this.selectedBranchIds.has(branchId);
  }

  exportJson(): void {
    this.treeService.exportToJson();
  }

  isLevelHidden(level: number): boolean {
    return this.hiddenLevels.has(level);
  }
}
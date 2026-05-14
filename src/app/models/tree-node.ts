// Tree node interface representing a single node in the hierarchy
export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

// Flattened node for UI display purposes
export interface FlatNode {
  id: string;
  name: string;
  depth: number;
}
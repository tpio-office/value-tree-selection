#!/usr/bin/env node
/**
 * Converts flat-records.json (NOAA value tree flat records) into a nested
 * TreeNode hierarchy and writes the result to src/app/data/sample-data.ts.
 *
 * Usage: node scripts/convert-flat-to-tree.mjs
 *
 * Algorithm:
 *   1. Read all flat records from flat-records.json at project root.
 *   2. Sort records by depth (shallowest first) so that the canonical ID for
 *      each unique path is taken from the shallowest record defining it.
 *   3. Walk/create the tree L1 → L2 → … → L(depth). Deduplicate by path:
 *      if two records share a prefix up to level N, they share the same node.
 *   4. Use value_tree_node_id (string) as id and long_name as name.
 *   5. Write TypeScript output to src/app/data/sample-data.ts.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Read input data
// ---------------------------------------------------------------------------

const flatRecordsPath = resolve(projectRoot, 'flat-records.json');
const flatRecords = JSON.parse(readFileSync(flatRecordsPath, 'utf-8'));

// ---------------------------------------------------------------------------
// Helper: get the value for a level field from a record
// ---------------------------------------------------------------------------

/**
 * Returns the short name for a given level (1-based) from a flat record.
 * @param {object} record - A flat record object.
 * @param {number} level - Level number (1-5).
 * @returns {string | null}
 */
function getShortName(record, level) {
  return record[`value_tree_level_${level}`] ?? null;
}

/**
 * Returns the long name for a given level (1-based) from a flat record.
 * Falls back to short name if long name is null or empty.
 * @param {object} record - A flat record object.
 * @param {number} level - Level number (1-5).
 * @returns {string | null}
 */
function getLongName(record, level) {
  const long = record[`value_tree_level_${level}_long_name`];
  if (long != null && long !== '') return long;
  return getShortName(record, level);
}

/**
 * Returns the max depth (1-5) of a flat record based on non-null level fields.
 * @param {object} record - A flat record object.
 * @returns {number}
 */
function getMaxDepth(record) {
  let depth = 1;
  for (let lvl = 2; lvl <= 5; lvl++) {
    if (getShortName(record, lvl)) {
      depth = lvl;
    } else {
      break;
    }
  }
  return depth;
}

// ---------------------------------------------------------------------------
// Build the tree
// ---------------------------------------------------------------------------

/**
 * Sort records by depth ascending so shallowest records are processed first.
 * This ensures the canonical (shallowest) node_id is assigned to each path.
 */
const sortedRecords = [...flatRecords].sort((a, b) => getMaxDepth(a) - getMaxDepth(b));

/**
 * Map from a path key (joined short names) to the TreeNode object at that path.
 * Used for deduplication: if two records share a prefix, they reuse the same node.
 */
const pathNodeMap = new Map();

/**
 * Root-level nodes keyed by their L1 short name.
 */
const rootNodes = [];

for (const record of sortedRecords) {
  const maxDepth = getMaxDepth(record);

  // Walk levels 1..maxDepth, creating or reusing nodes at each level.
  const parentChain = [];

  for (let lvl = 1; lvl <= maxDepth; lvl++) {
    const longName = getLongName(record, lvl);
    const nodeId = String(record.value_tree_node_id);

    // Build the path key up to this level using short names for uniqueness.
    const pathParts = [];
    for (let p = 0; p < parentChain.length; p++) {
      pathParts.push(parentChain[p].name);
    }
    pathParts.push(longName);
    const pathKey = pathParts.join('\x00');

    let node;
    if (pathNodeMap.has(pathKey)) {
      // Path already exists — reuse the existing node.
      node = pathNodeMap.get(pathKey);
    } else {
      // New path — create a new node.
      node = { id: nodeId, name: longName };
      pathNodeMap.set(pathKey, node);

      // Attach to parent (or root list for L1).
      if (lvl === 1) {
        rootNodes.push(node);
      } else {
        const parentNode = parentChain[lvl - 2];
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
      }
    }

    // Extend the parent chain for the next iteration.
    parentChain.push(node);
  }
}

// ---------------------------------------------------------------------------
// Determine the single root node
// ---------------------------------------------------------------------------

let rootTree;
if (rootNodes.length === 1) {
  rootTree = rootNodes[0];
} else {
  rootTree = { id: 'root', name: 'Root', children: rootNodes };
}

// ---------------------------------------------------------------------------
// Serialize to TypeScript source
// ---------------------------------------------------------------------------

/**
 * Escape single quotes and backslashes in a string for TypeScript literal output.
 * @param {string} str - The string to escape.
 * @returns {string}
 */
function escapeTsString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Recursively serialize a TreeNode to an array of TypeScript lines.
 * @param {object} node - A TreeNode object.
 * @param {number} indentLevel - Current indentation level (number of 2-space units).
 * @returns {string[]} Array of lines (no trailing newlines).
 */
function serializeNode(node, indentLevel) {
  const pad = '  '.repeat(indentLevel);

  if (!node.children || node.children.length === 0) {
    // Leaf node — single line.
    return [`{ id: '${escapeTsString(node.id)}', name: '${escapeTsString(node.name)}' }`];
  }

  const lines = [];
  lines.push('{');
  lines.push(`  id: '${escapeTsString(node.id)}',`);
  lines.push(`  name: '${escapeTsString(node.name)}',`);
  lines.push('  children: [');

  for (let i = 0; i < node.children.length; i++) {
    const childLines = serializeNode(node.children[i], indentLevel + 2);
    for (const line of childLines) {
      lines.push(`    ${line}`);
    }
    // Add comma after each child block.
    lines[lines.length - 1] += ',';
  }

  lines.push('  ]');
  lines.push('}');
  return lines;
}

const treeLines = serializeNode(rootTree, 0);

// ---------------------------------------------------------------------------
// Write output file
// ---------------------------------------------------------------------------

const outputPath = resolve(projectRoot, 'src', 'app', 'data', 'sample-data.ts');

const fileContent = [
  "import { TreeNode } from '../models/tree-node';",
  '',
  `export const sampleTreeData: TreeNode = ${treeLines.join('\n')};`,
  ''
].join('\n');

writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`Written ${fileContent.split('\n').length} lines to ${outputPath}`);
console.log(`Total flat records processed: ${flatRecords.length}`);
console.log(`Unique tree nodes created: ${pathNodeMap.size}`);

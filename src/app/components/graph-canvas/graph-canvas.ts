import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { TreeNode } from '../../models/tree-node';
import { TreeService } from '../../services/tree-service';

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  imports: [],
  template: `<svg #graphSvg></svg>`,
  styleUrls: ['./graph-canvas.scss']
})
export class GraphCanvasComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('graphSvg') graphSvg!: ElementRef<SVGSVGElement>;

  private subscriptions = new Subscription();
  private svg: any;
  private g: any;
  private zoom: any;

  constructor(private treeService: TreeService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.svg = d3.select(this.graphSvg.nativeElement);
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);
    this.g = this.svg.append('g');

    // Subscribe to tree data changes
    const treeSub = this.treeService.filteredTree$.subscribe(() => {
      setTimeout(() => this.renderTree(), 0);
    });

    // Subscribe to hidden levels changes
    const hiddenLevelsSub = this.treeService.hiddenLevels$.subscribe(() => {
      setTimeout(() => this.renderTree(), 0);
    });

    // Subscribe to branch selection changes
    const branchSub = this.treeService.selectedBranchIds$.subscribe(() => {
      setTimeout(() => this.renderTree(), 0);
    });

    this.subscriptions.add(treeSub);
    this.subscriptions.add(hiddenLevelsSub);
    this.subscriptions.add(branchSub);

    // Initial render
    setTimeout(() => this.renderTree(), 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private renderTree(): void {
    const treeData = this.treeService.getExportData();
    if (!treeData) return;

    const width = this.graphSvg.nativeElement.clientWidth || 800;
    const height = this.graphSvg.nativeElement.clientHeight || 600;

    this.svg.attr('width', width).attr('height', height);

    // Clear previous content
    this.g.selectAll('*').remove();

    // Create hierarchy
    const root = d3.hierarchy(treeData);

    // Calculate visible levels for layout adjustment
    const hiddenLevels: Set<number> = new Set();
    this.treeService.hiddenLevels$.subscribe((levels: Set<number>) => {
      levels.forEach((level: number) => hiddenLevels.add(level));
    });

    // Count only visible nodes for proper spacing
    const allNodes = root.descendants();
    const visibleNodes = allNodes.filter((d: any) => !hiddenLevels.has(d.depth));
    const nodeSpacing = 100;
    const totalHeight = Math.max(300, visibleNodes.length * nodeSpacing);

    // Tree layout with adjusted size based on visible nodes
    const treeLayout = d3.tree<TreeNode>().size([width - 120, totalHeight]);
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    // Draw links with smooth transitions
    const linkSelection = this.g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const sourceHidden = hiddenLevels.has(d.source.depth);
        const targetHidden = hiddenLevels.has(d.target.depth);
        if (sourceHidden || targetHidden) return '';
        return `M${d.source.y},${d.source.x}C${(d.source.y + d.target.y) / 2},${d.source.x} ${(d.source.y + d.target.y) / 2},${d.target.x} ${d.target.y},${d.target.x}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .style('opacity', (d: any) => {
        const sourceHidden = hiddenLevels.has(d.source.depth);
        const targetHidden = hiddenLevels.has(d.target.depth);
        return (sourceHidden || targetHidden) ? 0 : 1;
      })
      .transition()
      .duration(400)
      .ease(d3.easeCubicInOut);

    // Draw nodes with smooth transitions
    const node = this.g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .style('opacity', (d: any) => hiddenLevels.has(d.depth) ? 0 : 1)
      .style('pointer-events', (d: any) => hiddenLevels.has(d.depth) ? 'none' : 'all');

    // Node circles with transitions
    node.append('circle')
      .attr('r', 0)
      .attr('fill', (d: any) => d.data.children ? '#4a90d9' : '#67b26f')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .duration(400)
      .ease(d3.easeCubicInOut)
      .attr('r', 12);

    // Node labels with transitions
    node.append('text')
      .attr('dx', 18)
      .attr('dy', 4)
      .text((d: any) => d.data.name)
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .style('opacity', 0)
      .transition()
      .duration(400)
      .delay(200)
      .ease(d3.easeCubicInOut)
      .style('opacity', (d: any) => hiddenLevels.has(d.depth) ? 0 : 1);

    // Center the tree initially
    setTimeout(() => {
      const bounds = this.g.node()?.getBBox();
      if (bounds && bounds.width > 0) {
        const scale = Math.min(0.9, Math.min((width - 40) / bounds.width, (height - 40) / bounds.height));
        const translateX = (width - bounds.width * scale) / 2 - bounds.x * scale;
        const translateY = (height - bounds.height * scale) / 2 - bounds.y * scale;
        this.svg.transition()
          .duration(500)
          .ease(d3.easeCubicInOut)
          .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
      }
    }, 100);
  }
}
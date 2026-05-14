import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-node-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="context-menu" data-testid="context-menu" [style.left]="x + 'px'" [style.top]="y + 'px'">
      <div class="menu-header" data-testid="context-menu-header">{{ nodeName }}</div>
      <button class="menu-item remove-btn" data-testid="remove-node-btn" (click)="onRemove.emit()">
        <span class="icon">✕</span> Remove Node
      </button>
      <button class="menu-item prune-btn" data-testid="prune-children-btn" (click)="onPrune.emit()" *ngIf="hasChildren">
        <span class="icon">⊘</span> Keep Path Only (Prune Children)
      </button>
    </div>
  `,
  styleUrls: ['./node-context-menu.scss']
})
export class NodeContextMenuComponent {
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() nodeName: string = '';
  @Input() hasChildren: boolean = false;

  @Output() onRemove = new EventEmitter<string>();
  @Output() onPrune = new EventEmitter<string>();
}
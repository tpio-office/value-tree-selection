import { Component } from '@angular/core';
import { GraphCanvasComponent } from './components/graph-canvas/graph-canvas';
import { ControlPanelComponent } from './components/control-panel/control-panel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GraphCanvasComponent, ControlPanelComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1 class="app-title">Value Tree Selection</h1>
        <p class="app-subtitle">Visualize and filter hierarchical tree data</p>
      </header>
      <main class="app-main">
        <aside class="sidebar">
          <app-control-panel></app-control-panel>
        </aside>
        <section class="canvas-area">
          <app-graph-canvas></app-graph-canvas>
        </section>
      </main>
    </div>
  `,
  styleUrls: ['./app.scss']
})
export class App {}
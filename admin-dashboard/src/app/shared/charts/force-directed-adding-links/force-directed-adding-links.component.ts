import {
  Input,
  OnDestroy,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
  OnChanges,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import * as am4plugins_forceDirected from '@amcharts/amcharts4/plugins/forceDirected';
import { chartSharedImports } from '../../chart-shared-imports';
@Component({
  selector: 'force-directed-adding-links',
  templateUrl: './force-directed-adding-links.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class ForceDirectedAddingLinksComponent
  implements OnInit, OnDestroy, OnChanges
{
  private chart: any;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngOnChanges() {
    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4plugins_forceDirected.ForceDirectedTree
      );

      const networkSeries = this.chart.series.push(
        new am4plugins_forceDirected.ForceDirectedSeries()
      );

      am4core.useTheme(am4themes_animated);

      // remove logo from display
      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      this.chart.data = this.data;
      networkSeries.dataFields.value = 'value';
      networkSeries.dataFields.name = 'name';
      networkSeries.dataFields.children = 'children';
      networkSeries.nodes.template.tooltipText = '{name}:{value}';
      networkSeries.nodes.template.fillOpacity = 1;
      networkSeries.dataFields.id = 'name';
      networkSeries.dataFields.linkWith = 'linkWith';
      networkSeries.manyBodyStrength = -30;
      networkSeries.links.template.distance = 2;
      networkSeries.nodes.template.label.text = '{name}';
      networkSeries.fontSize = 10;
      networkSeries.minRadius = 15;
      networkSeries.maxRadius = 40;

      let selectedNode: am4plugins_forceDirected.ForceDirectedNode | undefined;

      const label = this.chart.createChild(am4core.Label);
      label.x = 50;
      label.y = 50;
      label.isMeasured = false;

      networkSeries.nodes.template.events.on('up', function (event: any) {
        const node = event.target;
        if (!selectedNode) {
          node.outerCircle.disabled = false;
          node.outerCircle.strokeDasharray = '3,3';
          selectedNode = node;
        } else if (selectedNode === node) {
          node.outerCircle.disabled = true;
          node.outerCircle.strokeDasharray = '';
          selectedNode = undefined;
        } else {
          const node = event.target;

          const link = node.linksWith.getKey(selectedNode.uid);

          if (link) {
            node.unlinkWith(selectedNode);
          } else {
            node.linkWith(selectedNode, 0.2);
          }
        }
      });
    });
  }

  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.chart) {
        this.chart.dispose();
      }
    });
  }
}

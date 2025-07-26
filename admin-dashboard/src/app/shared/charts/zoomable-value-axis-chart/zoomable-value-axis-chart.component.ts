import {
  Input,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
  OnDestroy,
  OnChanges,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'zoomable-value-axis-chart',
  templateUrl: './zoomable-value-axis-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ZoomableValueAxisChartComponent
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
    am4core.options.autoSetClassName = true;
    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.XYChart
      );

      am4core.useTheme(am4themes_animated);

      // remove logo from display
      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      // Add data
      this.chart.data = this.data;

      // Create axes
      const dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
      dateAxis.renderer.grid.template.location = 0;
      dateAxis.renderer.minGridDistance = 50;
      dateAxis.renderer.labels.template.fill = am4core.color('#ffffff');
      dateAxis.renderer.grid.template.stroke = '#ffffff';
      dateAxis.renderer.labels.template.fontSize = 9;

      const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      valueAxis.renderer.labels.template.disabled = true;
      valueAxis.renderer.grid.template.stroke = '#ffffff';
      // Create series
      const series = this.chart.series.push(new am4charts.LineSeries());
      series.dataFields.valueY = 'value';
      series.dataFields.dateX = 'date';
      series.strokeWidth = 3;
      series.fillOpacity = 0.5;

      // Add cursor
      this.chart.cursor = new am4charts.XYCursor();
      this.chart.cursor.behavior = 'zoomY';
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

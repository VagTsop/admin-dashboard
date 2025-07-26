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
  selector: 'depth-chart',
  templateUrl: './depth-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class DepthChartComponent implements OnInit, OnDestroy, OnChanges {
  chart!: am4charts.XYChart;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;
  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnChanges() {
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

      // Set up precision for numbers
      this.chart.numberFormatter.numberFormat = '#,###.####';

      // Create axes
      const xAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
      xAxis.dataFields.category = 'value';
      // xAxis.renderer.grid.template.location = 0;
      xAxis.renderer.minGridDistance = 23;
      xAxis.renderer.labels.template.disabled = true;
      xAxis.renderer.grid.template.stroke = am4core.color('#ffffff');

      const yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      yAxis.renderer.minGridDistance = 18;
      yAxis.renderer.labels.template.disabled = true;
      yAxis.renderer.grid.template.stroke = am4core.color('#ffffff');
      // Create series
      const series = this.chart.series.push(new am4charts.StepLineSeries());
      series.dataFields.categoryX = 'value';
      series.dataFields.valueY = 'bidstotalvolume';
      series.strokeWidth = 2;
      series.stroke = am4core.color('#0f0');
      series.fill = series.stroke;
      series.fillOpacity = 0.1;
      series.tooltipText =
        'Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{bidsvolume}[/]';

      const series2 = this.chart.series.push(new am4charts.StepLineSeries());
      series2.dataFields.categoryX = 'value';
      series2.dataFields.valueY = 'askstotalvolume';
      series2.strokeWidth = 2;
      series2.stroke = am4core.color('#f00');
      series2.fill = series2.stroke;
      series2.fillOpacity = 0.1;
      series2.tooltipText =
        'Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{asksvolume}[/]';

      const series3 = this.chart.series.push(new am4charts.ColumnSeries());
      series3.dataFields.categoryX = 'value';
      series3.dataFields.valueY = 'bidsvolume';
      series3.strokeWidth = 0;
      series3.fill = am4core.color('#000');
      series3.fillOpacity = 0.2;

      const series4 = this.chart.series.push(new am4charts.ColumnSeries());
      series4.dataFields.categoryX = 'value';
      series4.dataFields.valueY = 'asksvolume';
      series4.strokeWidth = 0;
      series4.fill = am4core.color('#000');
      series4.fillOpacity = 0.2;

      // Add cursor
      this.chart.cursor = new am4charts.XYCursor();
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.chart) {
        this.chart.dispose();
      }
    });
  }
}

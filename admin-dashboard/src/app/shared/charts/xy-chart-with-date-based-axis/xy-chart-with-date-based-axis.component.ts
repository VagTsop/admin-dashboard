import {
  OnDestroy,
  Input,
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
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'xy-chart-with-date-based-axis',
  templateUrl: './xy-chart-with-date-based-axis.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class XYChartWithDateBasedAxisComponent
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
        am4charts.XYChart
      );

      am4core.useTheme(am4themes_animated);

      // remove logo from display
      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      // Add data
      this.chart.data = this.data;
      // Create axes
      const xAxis = this.chart.xAxes.push(new am4charts.DateAxis());
      xAxis.dataFields.category = 'category';
      xAxis.renderer.grid.template.location = 0;
      xAxis.renderer.labels.template.disabled = true;
      xAxis.renderer.grid.template.stroke = '#ffffff';

      const yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      yAxis.renderer.minGridDistance = 18;
      yAxis.renderer.labels.template.disabled = true;
      yAxis.renderer.grid.template.stroke = '#ffffff';

      // Create series
      const series1 = this.chart.series.push(new am4charts.LineSeries());
      series1.dataFields.valueY = 'ay';
      series1.dataFields.dateX = 'date';
      series1.dataFields.value = 'aValue';
      series1.strokeOpacity = 0;
      series1.cursorTooltipEnabled = false;

      const bullet1 = series1.bullets.push(new am4charts.CircleBullet());
      bullet1.tooltipText = 'x:{valueX} y:{valueY}';
      series1.heatRules.push({
        target: bullet1.circle,
        min: 10,
        max: 60,
        property: 'radius',
      });

      const series2 = this.chart.series.push(new am4charts.LineSeries());
      series2.dataFields.valueY = 'by';
      series2.dataFields.dateX = 'date';
      series2.dataFields.value = 'bValue';
      series2.strokeOpacity = 0;
      series2.cursorTooltipEnabled = false;

      const bullet2 = series2.bullets.push(new am4charts.Bullet());
      bullet2.tooltipText = 'x:{valueX} y:{valueY}';

      const rectangle2 = bullet2.createChild(am4core.Rectangle);
      rectangle2.verticalCenter = 'middle';
      rectangle2.horizontalCenter = 'middle';
      rectangle2.width = 10;
      rectangle2.height = 10;
      rectangle2.rotation = 45;
      rectangle2.stroke = am4core.color('#fff');
      rectangle2.strokeWidth = 1;
      rectangle2.nonScalingStroke = true;
      series2.heatRules.push({
        target: rectangle2,
        min: 1,
        max: 6,
        property: 'scale',
      });

      // Add cursor
      this.chart.cursor = new am4charts.XYCursor();
      this.chart.cursor.behavior = 'zoomXY';
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

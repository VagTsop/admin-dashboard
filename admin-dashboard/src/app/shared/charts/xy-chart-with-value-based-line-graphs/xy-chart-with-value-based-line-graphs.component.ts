import { Input, OnChanges, OnDestroy } from '@angular/core';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';
@Component({
  selector: 'xy-chart-with-value-based-line-graphs',
  templateUrl: './xy-chart-with-value-based-line-graphs.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class XyChartWithValueBasedLineGraphsComponent
  implements OnInit, OnDestroy, OnChanges
{
  private chart: any;

  @Input() areLabelsDisabled!: boolean;
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
      this.chart.data = this.data;

      // Create axes
      const xAxis = this.chart.xAxes.push(new am4charts.ValueAxis());
      xAxis.renderer.minGridDistance = 12;
      xAxis.renderer.labels.template.fill = am4core.color('#ffffff');
      xAxis.renderer.grid.template.stroke = '#ffffff';
      xAxis.renderer.labels.template.fontSize = 8;

      // Create value axis
      const yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      yAxis.renderer.labels.template.fill = am4core.color('#ffffff');
      yAxis.renderer.minGridDistance = 12;
      yAxis.renderer.grid.template.stroke = '#ffffff';
      yAxis.renderer.labels.template.fontSize = 8;

      if (this.areLabelsDisabled) {
        xAxis.renderer.labels.template.disabled = true;
        yAxis.renderer.labels.template.disabled = true;
      }

      // Create series
      const series1 = this.chart.series.push(new am4charts.LineSeries());
      series1.dataFields.valueX = 'x';
      series1.dataFields.valueY = 'ay';
      series1.dataFields.value = 'aValue';
      series1.strokeWidth = 2;

      const bullet1 = series1.bullets.push(new am4charts.CircleBullet());
      series1.heatRules.push({
        target: bullet1.circle,
        min: 5,
        max: 20,
        property: 'radius',
      });

      bullet1.tooltipText = '{valueX} x {valueY}: [bold]{value}[/]';

      const series2 = this.chart.series.push(new am4charts.LineSeries());
      series2.dataFields.valueX = 'x';
      series2.dataFields.valueY = 'by';
      series2.dataFields.value = 'bValue';
      series2.strokeWidth = 2;

      const bullet2 = series2.bullets.push(new am4charts.CircleBullet());
      series2.heatRules.push({
        target: bullet2.circle,
        min: 5,
        max: 20,
        property: 'radius',
      });

      bullet2.tooltipText = '{valueX} x {valueY}: [bold]{value}[/]';

      // scrollbars
      this.chart.scrollbarX = new am4core.Scrollbar();
      this.chart.scrollbarY = new am4core.Scrollbar();
      if (this.areLabelsDisabled) {
        this.chart.scrollbarX.disabled = true;
        this.chart.scrollbarY.disabled = true;
      }
      this.chart.scrollbarX.minHeight = 4;
      this.chart.scrollbarY.minWidth = 4;

      this.chart.scrollbarX.startGrip.icon.disabled = true;
      this.chart.scrollbarX.endGrip.icon.disabled = true;
      this.chart.scrollbarY.startGrip.icon.disabled = true;
      this.chart.scrollbarY.endGrip.icon.disabled = true;

      this.chart.scrollbarX.thumb.background.fill = am4core.color('#484646cf');
      this.chart.scrollbarX.background.fillOpacity = 0;
      this.chart.scrollbarX.background.fill = am4core.color('#ffffff');
      this.chart.scrollbarX.strokeWidth = 0;
      this.chart.scrollbarX.startGrip.background.fill =
        am4core.color('#272727');
      this.chart.scrollbarX.endGrip.background.fill = am4core.color('#272727');

      this.chart.scrollbarY.thumb.background.fill = am4core.color('#484646cf');
      this.chart.scrollbarY.background.fillOpacity = 0;
      this.chart.scrollbarY.background.fill = am4core.color('#ffffff');
      this.chart.scrollbarY.strokeWidth = 0;
      this.chart.scrollbarY.startGrip.background.fill =
        am4core.color('#272727');
      this.chart.scrollbarY.endGrip.background.fill = am4core.color('#272727');
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

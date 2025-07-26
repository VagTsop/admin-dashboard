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
  selector: 'column-chart-with-axis-break',
  standalone: true,
  imports: [chartSharedImports],
  templateUrl: './column-chart-with-axis-break.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class ColumnChartWithAxisBreakComponent
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

      this.chart.hiddenState.properties.opacity = 0; // this creates initial fade-in

      this.chart.data = this.data;

      const categoryAxis = this.chart.xAxes.push(
        new am4charts.CategoryAxis() as any
      );
      categoryAxis.renderer.grid.template.location = 0;
      categoryAxis.dataFields.category = 'country';
      categoryAxis.renderer.minGridDistance = 40;
      categoryAxis.renderer.labels.template.disabled = true;
      categoryAxis.renderer.grid.template.stroke = '#ffffff';

      const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis() as any);
      valueAxis.min = 0;
      valueAxis.max = 24000;
      valueAxis.strictMinMax = true;
      valueAxis.renderer.minGridDistance = 30;
      valueAxis.renderer.labels.template.disabled = true;
      valueAxis.renderer.grid.template.stroke = '#ffffff';
      // axis break
      const axisBreak = valueAxis.axisBreaks.create();
      axisBreak.startValue = 2100;
      axisBreak.endValue = 22900;

      // axisBreak.breakSize = 0.005;

      // fixed axis break
      const d =
        (axisBreak.endValue - axisBreak.startValue) /
        (valueAxis.max - valueAxis.min);
      axisBreak.breakSize = (0.05 * (1 - d)) / d; // 0.05 means that the break will take 5% of the total value axis height

      // make break expand on hover
      const hoverState = axisBreak.states.create('hover');
      hoverState.properties.breakSize = 1;
      hoverState.properties.opacity = 0.1;
      hoverState.transitionDuration = 1500;

      axisBreak.defaultState.transitionDuration = 1000;

      const series = this.chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.categoryX = 'country';
      series.dataFields.valueY = 'visits';
      series.columns.template.tooltipText = '{valueY.value}';
      series.columns.template.tooltipY = 0;
      series.columns.template.strokeOpacity = 0;

      // as by default columns of the same series are of the same color, we add adapter which takes colors from chart.colors color set
      series.columns.template.adapter.add(
        'fill',
        (fill: am4core.Color, target: am4core.Sprite) => {
          return this.chart.colors.getIndex((target.dataItem as any).index);
        }
      );
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

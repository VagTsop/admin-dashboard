import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
  Input,
  OnDestroy,
  OnChanges,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'sparkline-chart',
  templateUrl: './sparkline-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class SparkLineChartComponent implements OnInit, OnChanges, OnDestroy {
  chart!: am4charts.XYChart;
  private isViewInitialized = false;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    if (this.data) this.renderChart();
  }

  ngOnChanges() {
    if (this.isViewInitialized && this.data) {
      this.renderChart();
    }
  }

  private renderChart() {
    if (!this.diagramRef) return;
    this.zone.runOutsideAngular(() => {
      const container = am4core.create(
        this.diagramRef.nativeElement,
        am4core.Container
      );
      am4core.options.autoDispose = true;
      am4core.useTheme(am4themes_animated);

      this.renderer.removeChild(container, container.logo.dom);
      container.layout = 'grid';
      container.fixedWidthGrid = false;
      container.width = am4core.percent(100);
      container.height = am4core.percent(100);

      const colors = new am4core.ColorSet();

      const createProcessInstancesLine = (
        title: string,
        data: string,
        color:
          | am4core.Color
          | am4core.Pattern
          | am4core.LinearGradient
          | am4core.RadialGradient
      ) => {
        const chart = container.createChild(am4charts.XYChart);
        chart.width = am4core.percent(100);
        chart.height = am4core.percent(100);

        chart.data = data as any;

        chart.titles.template.fontSize = 9;
        chart.titles.template.fill = am4core.color('#ffffff');
        chart.titles.template.textAlign = 'middle';
        chart.titles.template.isMeasured = false;
        chart.titles.create().text = title;

        chart.padding(15, 0, 0, 0);

        const dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.disabled = true;
        dateAxis.renderer.labels.template.disabled = true;
        dateAxis.startLocation = 0.5;
        dateAxis.endLocation = 0.7;
        dateAxis.cursorTooltipEnabled = false;

        const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.min = 0;
        valueAxis.renderer.grid.template.disabled = true;
        valueAxis.renderer.baseGrid.disabled = true;
        valueAxis.renderer.labels.template.disabled = true;
        valueAxis.cursorTooltipEnabled = false;

        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.disabled = true;
        chart.cursor.behavior = 'none';

        const series = chart.series.push(new am4charts.LineSeries());
        series.showOnInit = false;
        if (series.tooltip) {
          series.tooltip.animationDuration = 0;
        }
        series.tooltipText = '{date}: [bold]{value}';
        series.dataFields.dateX = 'date';
        series.dataFields.valueY = 'value';
        series.tensionX = 0.8;
        series.strokeWidth = 2;
        series.stroke = color;

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.opacity = 0;
        bullet.circle.fill = color;
        bullet.circle.propertyFields.opacity = 'opacity';
        bullet.circle.radius = 3;

        return chart;
      };

      function createAdministrateLine(data: any, color: any) {
        const chart = container.createChild(am4charts.XYChart);
        chart.width = am4core.percent(110);
        chart.height = am4core.percent(100);

        chart.data = data;

        chart.titles.template.fontSize = 9;
        chart.titles.template.fill = am4core.color('#ffffff');
        chart.titles.template.textAlign = 'middle';
        chart.titles.template.isMeasured = false;

        chart.padding(15, 0, 0, 0);

        const dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.disabled = true;
        dateAxis.renderer.labels.template.disabled = true;
        dateAxis.startLocation = 0.5;
        dateAxis.endLocation = 1.2;
        dateAxis.cursorTooltipEnabled = false;

        const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.min = 0;
        valueAxis.renderer.grid.template.disabled = true;
        valueAxis.renderer.baseGrid.disabled = true;
        valueAxis.renderer.labels.template.disabled = true;
        valueAxis.cursorTooltipEnabled = false;

        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.disabled = true;
        chart.cursor.behavior = 'none';

        const series = chart.series.push(new am4charts.LineSeries());
        series.showOnInit = false;
        series.fillOpacity = 1;

        const fillModifier = new am4core.LinearGradientModifier();
        fillModifier.opacities = [1, 1];
        fillModifier.offsets = [0, 1];
        fillModifier.gradient.rotation = 90;
        series.segments.template.fillModifier = fillModifier;
        series.tooltipText = '{date}: [bold]{value}';
        series.dataFields.dateX = 'date';
        series.dataFields.valueY = 'value';
        series.tensionX = 0.8;
        series.strokeWidth = 2;
        series.stroke = am4core.color(color);
        return chart;
      }

      if (this.identifier === 'taskInstancesActivityTracker') {
        createProcessInstancesLine(
          'Imprints Diagram',
          this.data,
          colors.getIndex(0)
        );
      }

      if (
        this.identifier === 'interfaces' ||
        'interactions' ||
        'attestations'
      ) {
        createAdministrateLine(this.data, colors.getIndex(0));
      }
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

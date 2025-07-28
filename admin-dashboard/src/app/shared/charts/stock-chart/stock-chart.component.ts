import {
  OnDestroy,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
  Input,
  OnChanges,
  AfterViewInit,
} from '@angular/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4core from '@amcharts/amcharts4/core';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'stock-chart',
  templateUrl: './stock-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class StockChartComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  private chart: any;
  private viewInitialized = false;

  @Input() strokeColor!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.data) this.initChart();
  }

  ngOnChanges(): void {
    if (this.viewInitialized && this.data) this.initChart();
  }

  private initChart(): void {
    if (!this.diagramRef) return;

    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.XYChart
      );

      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      this.chart.colors.step = 3;
      this.chart.padding(0, 0, 0, 15);

      const dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
      dateAxis.renderer.grid.template.disabled = true;
      dateAxis.renderer.ticks.template.disabled = false;
      dateAxis.renderer.labels.template.disabled = true;
      dateAxis.groupData = true;
      dateAxis.minZoomCount = 5;

      const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      valueAxis.tooltip.disabled = true;
      valueAxis.baseValue = -100;
      valueAxis.zIndex = 1;
      valueAxis.renderer.baseGrid.disabled = true;
      valueAxis.renderer.labels.template.disabled = true;
      valueAxis.renderer.gridContainer.background.fill = am4core.color('#000');
      valueAxis.renderer.gridContainer.background.fillOpacity = 0.05;
      valueAxis.renderer.inside = true;
      valueAxis.renderer.labels.template.verticalCenter = 'bottom';
      valueAxis.renderer.fontSize = '0.8em';

      const series = this.chart.series.push(new am4charts.LineSeries());
      series.showOnInit = false;
      series.tooltip.animationDuration = 0;
      series.strokeWidth = 1;
      series.dataFields.dateX = 'date';
      series.dataFields.valueY = 'price';
      series.dataFields.valueYShow = 'changePercent';
      series.tooltipText =
        "{name}: {valueY.changePercent.formatNumber('[#0c0]+#.00|[#c00]#.##|0')}%";
      series.name = 'Stock A';
      series.tooltip.getFillFromObject = false;
      series.tooltip.getStrokeFromObject = true;
      series.tooltip.background.fill = am4core.color('#fff');
      series.tooltip.background.strokeWidth = 2;
      series.tooltip.label.fill = series.stroke;
      series.fillOpacity = 1;
      series.tensionX = 0.9;

      const fillModifier = new am4core.LinearGradientModifier();
      fillModifier.opacities = [1, 0];
      fillModifier.offsets = [0, 1];
      fillModifier.gradient.rotation = 90;
      series.segments.template.fillModifier = fillModifier;

      this.chart.cursor = new am4charts.XYCursor();
      this.chart.data = this.data;

      if (
        this.identifier === 'shipmentOrdersInbound' ||
        this.identifier === 'shipmentOrdersOutbound'
      ) {
        series.stroke = am4core.color('#a845ad');
      } else if (
        this.identifier === 'messagesIncoming' ||
        this.identifier === 'messagesOutcoming'
      ) {
        series.stroke = am4core.color('#07b85c');
      }

      series.fill = series.stroke;
      this.chart.leftAxesContainer.layout = 'vertical';
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

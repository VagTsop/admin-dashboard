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
  selector: 'micro-chart',
  templateUrl: './micro-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class MicroChartComponent implements OnInit, OnChanges, OnDestroy {
  chart!: am4charts.XYChart;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngOnChanges() {
    this.zone.runOutsideAngular(() => {
      const container = am4core.create(
        this.diagramRef.nativeElement,
        am4core.Container
      );
      am4core.options.autoDispose = true;
      am4core.useTheme(am4themes_animated);

      // remove logo from display
      this.renderer.removeChild(container, container.logo.dom);

      container.layout = 'grid';
      container.fixedWidthGrid = false;
      container.width = am4core.percent(100);
      container.height = am4core.percent(100);

      // Color set
      const colors = new am4core.ColorSet();

      const createColumn = (
        data: string,
        color:
          | am4core.Color
          | am4core.Pattern
          | am4core.LinearGradient
          | am4core.RadialGradient
      ) => {
        const chart = container.createChild(am4charts.XYChart);
        chart.data = data as any;

        // Add chart title
        const title = chart.titles.create() as any;
        title.fill = '#ffffff';
        title.text = 'AAPL (Turnover)';
        title.fontSize = 9;
        title.align = 'left';

        chart.padding(20, 5, 2, 5);

        const dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.disabled = true;
        dateAxis.renderer.labels.template.disabled = true;
        dateAxis.cursorTooltipEnabled = false;

        const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.min = 0;
        valueAxis.renderer.grid.template.disabled = true;
        valueAxis.renderer.baseGrid.disabled = true;
        valueAxis.renderer.labels.template.disabled = true;
        valueAxis.cursorTooltipEnabled = false;

        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.disabled = true;

        const series = chart.series.push(new am4charts.ColumnSeries());
        series.showOnInit = false;
        if (series.tooltip) {
          series.tooltip.animationDuration = 0;
        }
        series.tooltipText = '{date}: [bold]{value}';
        series.dataFields.dateX = 'date';
        series.dataFields.valueY = 'value';
        series.strokeWidth = 0;
        series.fillOpacity = 0.5;
        series.columns.template.propertyFields.fillOpacity = 'opacity';
        series.columns.template.fill = color;

        return chart;
      };
      createColumn(this.data, colors.getIndex(0));
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

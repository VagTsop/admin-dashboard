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
  selector: 'horizontally-stacked-axis',
  templateUrl: './horizontally-stacked-axis.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class HorizontallyStackedAxisComponent
  implements OnInit, OnDestroy, OnChanges
{
  chart!: am4charts.XYChart;

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

      const interfaceColors = new am4core.InterfaceColorSet();

      this.chart.data = this.data;
      // the following line makes value axes to be arranged vertically.
      this.chart.bottomAxesContainer.layout = 'horizontal';
      this.chart.bottomAxesContainer.reverseOrder = true;

      const categoryAxis = this.chart.yAxes.push(
        new am4charts.CategoryAxis() as any
      );
      categoryAxis.dataFields.category = 'category';
      categoryAxis.renderer.grid.template.stroke =
        interfaceColors.getFor('background');
      categoryAxis.renderer.grid.template.strokeOpacity = 1;
      categoryAxis.renderer.grid.template.location = 1;
      categoryAxis.renderer.minGridDistance = 15;
      categoryAxis.renderer.labels.template.disabled = true;
      categoryAxis.renderer.grid.template.stroke = '#000000';

      const valueAxis1 = this.chart.xAxes.push(
        new am4charts.ValueAxis() as any
      );
      valueAxis1.tooltip.disabled = true;
      valueAxis1.renderer.baseGrid.disabled = true;
      valueAxis1.renderer.minGridDistance = 25;
      valueAxis1.marginRight = 30;
      valueAxis1.renderer.gridContainer.background.fill =
        am4core.color('#ffffff');
      valueAxis1.renderer.gridContainer.background.fillOpacity = 0.08;

      valueAxis1.renderer.grid.template.stroke = '#000000';
      valueAxis1.renderer.grid.template.strokeOpacity = 1;
      valueAxis1.renderer.labels.template.fill = am4core.color('#ffffff');
      valueAxis1.renderer.labels.template.fontSize = 8;

      const series1 = this.chart.series.push(new am4charts.LineSeries());
      series1.dataFields.categoryY = 'category';
      series1.dataFields.valueX = 'value1';
      series1.xAxis = valueAxis1;
      series1.name = 'Series 1';
      const bullet1 = series1.bullets.push(new am4charts.CircleBullet());
      bullet1.tooltipText = '{valueX.value}';

      const valueAxis2 = this.chart.xAxes.push(
        new am4charts.ValueAxis() as any
      );
      valueAxis2.tooltip.disabled = true;
      valueAxis2.renderer.baseGrid.disabled = true;
      valueAxis2.marginRight = 30;
      valueAxis2.renderer.minGridDistance = 30;
      valueAxis2.renderer.gridContainer.background.fill =
        am4core.color('#ffffff');
      valueAxis2.renderer.grid.template.location = 1;
      valueAxis2.renderer.gridContainer.background.fillOpacity = 0.08;
      valueAxis2.renderer.grid.template.stroke =
        interfaceColors.getFor('background');

      valueAxis2.renderer.grid.template.stroke = '#000000';
      valueAxis2.renderer.grid.template.strokeOpacity = 1;
      valueAxis2.renderer.labels.template.fill = am4core.color('#ffffff');
      valueAxis2.renderer.labels.template.fontSize = 8;

      const series2 = this.chart.series.push(new am4charts.ColumnSeries());
      series2.dataFields.categoryY = 'category';
      series2.dataFields.valueX = 'value2';
      series2.xAxis = valueAxis2;
      series2.name = 'Series 2';
      const bullet2 = series2.bullets.push(new am4charts.CircleBullet());
      bullet2.fillOpacity = 0;
      bullet2.strokeOpacity = 0;
      bullet2.tooltipText = '{valueX.value}';

      const valueAxis3 = this.chart.xAxes.push(
        new am4charts.ValueAxis() as any
      );
      valueAxis3.tooltip.disabled = true;
      valueAxis3.renderer.baseGrid.disabled = true;
      valueAxis3.marginRight = 30;
      valueAxis3.renderer.gridContainer.background.fill =
        am4core.color('#ffffff');
      valueAxis3.renderer.gridContainer.background.fillOpacity = 0.08;
      valueAxis3.renderer.grid.template.stroke =
        interfaceColors.getFor('background');
      valueAxis3.renderer.grid.template.stroke = '#000000';
      valueAxis3.renderer.grid.template.strokeOpacity = 1;
      valueAxis3.renderer.labels.template.fill = am4core.color('#ffffff');
      valueAxis3.renderer.labels.template.fontSize = 8;
      valueAxis3.renderer.minGridDistance = 25;

      const series3 = this.chart.series.push(new am4charts.LineSeries());
      series3.dataFields.categoryY = 'category';
      series3.dataFields.valueX = 'value3';
      series3.xAxis = valueAxis3;
      series3.name = 'Series 3';
      const bullet3 = series3.bullets.push(new am4charts.CircleBullet());
      bullet3.tooltipText = '{valueX.value}';

      this.chart.cursor = new am4charts.XYCursor();
      this.chart.cursor.behavior = 'zoomY';

      const scrollbarY = new am4core.Scrollbar();
      this.chart.scrollbarY = scrollbarY;
      this.chart.scrollbarY.minWidth = 4;
      this.chart.scrollbarY.startGrip.icon.disabled = true;
      this.chart.scrollbarY.endGrip.icon.disabled = true;
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

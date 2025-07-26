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
  selector: 'horizontal-dumbbell-plot',
  templateUrl: './horizontal-dumbbell-plot-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HorizontalDumbbellPlotComponent
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

      this.chart.data = this.data;

      const categoryAxis = this.chart.yAxes.push(
        new am4charts.CategoryAxis() as any
      );
      categoryAxis.renderer.grid.template.location = 0;
      categoryAxis.renderer.ticks.template.disabled = true;
      categoryAxis.renderer.axisFills.template.disabled = true;
      categoryAxis.dataFields.category = 'category';
      categoryAxis.renderer.minGridDistance = 15;
      categoryAxis.renderer.inversed = true;
      categoryAxis.renderer.inside = true;
      categoryAxis.renderer.grid.template.location = 0.5;
      categoryAxis.renderer.labels.template.fill = am4core.color('white');
      categoryAxis.renderer.grid.template.stroke = '#ffffff';
      categoryAxis.renderer.labels.template.disabled = true;

      const valueAxis = this.chart.xAxes.push(new am4charts.ValueAxis() as any);
      valueAxis.tooltip.disabled = true;
      valueAxis.renderer.ticks.template.disabled = true;
      valueAxis.renderer.axisFills.template.disabled = true;
      valueAxis.renderer.labels.template.fill = am4core.color('white');
      valueAxis.renderer.grid.template.stroke = '#ffffff';
      valueAxis.renderer.labels.template.fontSize = 8;

      const series = this.chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.categoryY = 'category';
      series.dataFields.openValueX = 'open';
      series.dataFields.valueX = 'close';
      series.tooltipText = 'open: {openValueX.value} close: {valueX.value}';
      series.sequencedInterpolation = true;
      series.fillOpacity = 0;
      series.strokeOpacity = 1;
      series.columns.template.height = 0.01;
      series.tooltip.pointerOrientation = 'vertical';

      const openBullet: any = series.bullets.create(am4charts.CircleBullet);
      openBullet.locationX = 1;

      const closeBullet = series.bullets.create(am4charts.CircleBullet);

      closeBullet.fill = this.chart.colors.getIndex(4);
      closeBullet.stroke = closeBullet.fill;

      this.chart.cursor = new am4charts.XYCursor();
      this.chart.cursor.behavior = 'zoomY';

      // scrollbars
      this.chart.scrollbarX = new am4core.Scrollbar();
      this.chart.scrollbarY = new am4core.Scrollbar();

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

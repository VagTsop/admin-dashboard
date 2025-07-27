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

const COLOR_MAP: Record<string, string> = {
  active: '#4949FF',
  deactivated: '#7879FF',
  terminated: '#A3A3FF',
  pending: '#BFBFFF',
  licencee: '#4949FF',
  partner: '#7879FF',
  hosted: '#A3A3FF',
  notApplied: '#BFBFFF',
  accessibleApps: '#344D90',
  groupMembers: '#5CC5EF',
};

@Component({
  selector: 'column-chart',
  standalone: true,
  imports: [chartSharedImports],
  templateUrl: './column-chart.component.html',
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ColumnChartComponent implements OnInit, OnDestroy, OnChanges {
  chart!: am4charts.XYChart;
  private isViewInitialized = false;
  private xAxis!: am4charts.CategoryAxis;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    if (this.data) this.createChart();
  }

  ngOnChanges() {
    if (this.isViewInitialized && this.data) this.createChart();
  }

  private createChart(): void {
    if (!this.diagramRef) return;

    am4core.options.animationsEnabled = false;
    am4core.options.autoSetClassName = true;

    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.XYChart
      );
      am4core.useTheme(am4themes_animated);
      this.renderer.removeChild(this.chart, this.chart.logo.dom);
      this.chart.data = this.data;

      const topContainer = this.chart.chartContainer.createChild(
        am4core.Container
      );
      topContainer.layout = 'absolute';
      topContainer.toBack();
      topContainer.width = am4core.percent(100);

      switch (this.identifier) {
        case 'processInstancesbyUser':
          this.setupProcessInstancesChart();
          break;

        case 'nodesBeneficiariesUsers':
          this.setupLegendTop('Entities By Status');
          ['active', 'deactivated', 'terminated', 'pending'].forEach((k) =>
            this.createSeries(k, this.toTitle(k))
          );
          break;

        case 'groups':
          this.setupLegendTop();
          this.createSeries('accessibleApps', 'Accessible Apps');
          this.createSeries('groupMembers', 'Group Members');
          break;

        case 'beneficiaries':
          this.setupLegendRight('Beneficiaries (Per Type)');
          ['licencee', 'partner', 'hosted', 'notApplied'].forEach((k) =>
            this.createSeries(k, this.toTitle(k))
          );
          break;
      }
    });
  }

  private setupProcessInstancesChart() {
    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = 'name';
    categoryAxis.renderer.inside = true;
    categoryAxis.renderer.labels.template.fontSize = 12;
    categoryAxis.renderer.grid.template.stroke = am4core.color('#ffffff');

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.labels.template.disabled = true;

    this.chart.paddingBottom = 25;

    const series = this.chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'points';
    series.dataFields.categoryX = 'name';
    series.columns.template.propertyFields.fill = 'color';
    series.columns.template.propertyFields.stroke = 'color';
    series.columns.template.column.cornerRadiusTopLeft = 15;
    series.columns.template.column.cornerRadiusTopRight = 15;
    series.columns.template.tooltipText = '{categoryX}: [bold]{valueY}[/b]';
  }

  private setupLegendTop(titleText?: string) {
    this.chart.colors.step = 2;
    this.chart.legend = new am4charts.Legend();
    this.chart.legend.layout = 'horizontal';
    this.chart.legend.position = 'top';
    this.chart.legend.paddingBottom = 20;
    this.chart.legend.labels.template.fill = am4core.color('#ffffff');
    this.chart.legend.labels.template.fontSize = 10;

    const markerTemplate = this.chart.legend.markers.template;
    markerTemplate.width = 10;
    markerTemplate.height = 10;

    this.createChartTitle(titleText, -55);
    this.setupAxes('category', 10, 0);
  }

  private setupLegendRight(titleText: string) {
    this.chart.legend = new am4charts.Legend();
    this.chart.legend.layout = 'vertical';
    this.chart.legend.position = 'right';

    const markerTemplate = this.chart.legend.markers.template;
    markerTemplate.width = 10;
    markerTemplate.height = 10;

    this.createChartTitle(titleText, -15);
    this.setupAxes('category', 10, 0);
  }

  private setupAxes(category: string, fontSize: number, yAxisMin: number) {
    this.xAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    this.xAxis.dataFields.category = category;
    this.xAxis.renderer.labels.template.fontSize = fontSize;

    const yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.min = yAxisMin;
    yAxis.renderer.labels.template.fontSize = fontSize;
    yAxis.renderer.grid.template.stroke = am4core.color('#ffffff');
  }

  private createChartTitle(text?: string, dy?: number) {
    if (!text) return;
    const topContainer = this.chart.chartContainer.children.getIndex(
      0
    ) as am4core.Container;
    const title = topContainer.createChild(am4core.Label);
    title.text = text;
    title.align = 'center';
    title.fill = am4core.color('#ffffff');
    title.dy = dy ?? -30;
    title.fontSize = 12;
  }

  createSeries(value: string, name: string) {
    const series = this.chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = value;
    series.dataFields.categoryX = 'category';
    series.name = name;
    series.strokeWidth = 0;

    series.columns.template.adapter.add('fill', () =>
      am4core.color(COLOR_MAP[value] || '#cccccc')
    );

    series.events.on('hidden', this.arrangeColumns);
    series.events.on('shown', this.arrangeColumns);

    const bullet = series.bullets.push(new am4charts.LabelBullet());
    bullet.label.text = '{valueY}';
    bullet.label.fontSize = 10;
    bullet.label.fill = am4core.color('#ffffff');
    bullet.dy = 30;

    return series;
  }

  private toTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }

  arrangeColumns = () => {
    const series = this.chart.series.getIndex(0);
    if (!series || series.dataItems.length < 2) return;

    const d0 = series.dataItems.getIndex(0);
    const d1 = series.dataItems.getIndex(1);
    if (!d0 || !d1) return;

    const x0 = this.xAxis.getX(d0, 'categoryX');
    const x1 = this.xAxis.getX(d1, 'categoryX');
    const delta =
      ((x1 - x0) / this.chart.series.length) *
      (1 -
        this.xAxis.renderer.cellStartLocation -
        (1 - this.xAxis.renderer.cellEndLocation));

    if (!am4core.isNumber(delta)) return;

    const middle = this.chart.series.length / 2;
    let newIndex = 0;
    this.chart.series.each((s: any) => {
      s.dummyData =
        !s.isHidden && !s.isHiding ? newIndex++ : this.chart.series.indexOf(s);
    });

    const newMiddle = newIndex / 2;
    this.chart.series.each((s: any) => {
      const trueIndex = this.chart.series.indexOf(s);
      const dx = (s.dummyData - trueIndex + middle - newMiddle) * delta;
      s.animate(
        { property: 'dx', to: dx },
        s.interpolationDuration,
        s.interpolationEasing
      );
      s.bulletsContainer.animate(
        { property: 'dx', to: dx },
        s.interpolationDuration,
        s.interpolationEasing
      );
    });
  };

  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.chart) this.chart.dispose();
    });
  }
}

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

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;
  private xAxis!: am4charts.CategoryAxis;
  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    if (this.data) this.createChart();
  }

  ngOnChanges() {
    if (this.isViewInitialized && this.data) {
      this.createChart();
    }
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

      if (this.identifier === 'processInstancesbyUser') {
        const categoryAxis = this.chart.xAxes.push(
          new am4charts.CategoryAxis() as any
        );
        categoryAxis.dataFields.category = 'name';
        categoryAxis.renderer.grid.template.disabled = true;
        categoryAxis.renderer.minGridDistance = 30;
        categoryAxis.renderer.inside = true;
        categoryAxis.renderer.labels.template.fontSize = 25;
        categoryAxis.renderer.grid.template.stroke = '#ffffff';

        const valueAxis = this.chart.yAxes.push(
          new am4charts.ValueAxis() as any
        );
        valueAxis.renderer.labels.template.disabled = true;
        valueAxis.renderer.grid.template.stroke = '#ffffff';
        valueAxis.min = 0;

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
      if (
        this.identifier === 'nodesBeneficiariesUsers' ||
        this.identifier === 'groups' ||
        this.identifier === 'beneficiaries'
      ) {
        this.chart.colors.step = 2;
        this.chart.legend = new am4charts.Legend();
        this.chart.legend.paddingBottom = 20;
        this.chart.legend.labels.template.fill = am4core.color('#ffffff');
        this.chart.legend.labels.template.width = 10;
        this.chart.legend.labels.template.fontSize = 18;

        const markerTemplate = this.chart.legend.markers.template;
        markerTemplate.width = 10;
        markerTemplate.height = 10;

        const xAxis = this.chart.xAxes.push(
          new am4charts.CategoryAxis() as any
        );
        xAxis.dataFields.category = 'category';
        xAxis.renderer.cellStartLocation = 0.1;
        xAxis.renderer.cellEndLocation = 0.9;
        xAxis.renderer.grid.template.location = 0;
        xAxis.renderer.labels.template.fontSize = 18;
        const yAxis = this.chart.yAxes.push(new am4charts.ValueAxis() as any);
        yAxis.min = 0;
        yAxis.renderer.labels.template.fontSize = 18;
        yAxis.renderer.grid.template.stroke = '#ffffff';
      }

      if (this.identifier === 'nodesBeneficiariesUsers') {
        this.chart.paddingBottom = 0;
        this.chart.paddingTop = 0;
        this.chart.legend.layout = 'horizontal';
        this.chart.legend.position = 'top';
        this.chart.legend.maxHeight = 3;
        this.chart.legend.paddingTop = 20;
        this.chart.legend.marginBottom = 15;

        const title = topContainer.createChild(am4core.Label) as any;
        topContainer.layout = 'absolute';
        topContainer.toBack();
        topContainer.width = am4core.percent(100);

        title.text = 'Entities By Status';
        title.align = 'center';
        title.fill = '#ffffff';
        title.dy = -55;
        title.fontSize = 25;

        this.createSeries('active', 'Active');
        this.createSeries('deactivated', 'Deactivated');
        this.createSeries('terminated', 'Terminated');
        this.createSeries('pending', 'Pending');
      } else if (this.identifier === 'groups') {
        this.chart.legend.layout = 'horizontal';
        this.chart.legend.position = 'top';

        this.createSeries('accessibleApps', 'Accessible Apps');
        this.createSeries('groupMembers', 'Group Members');
      } else if (this.identifier === 'beneficiaries') {
        this.chart.legend.layout = 'vertical';
        this.chart.legend.position = 'right';

        const topContainer = this.chart.chartContainer.createChild(
          am4core.Container
        );
        topContainer.layout = 'absolute';
        topContainer.toBack();
        topContainer.width = am4core.percent(100);

        const title = topContainer.createChild(am4core.Label) as any;
        title.text = 'Beneficiaries (Per Type)';
        title.align = 'center';
        title.fill = '#ffffff';
        title.dy = -15;
        title.fontSize = 25;

        this.createSeries('licencee', 'Licencee');
        this.createSeries('partner', 'Partner');
        this.createSeries('hosted', 'Hosted');
        this.createSeries('notApplied', 'Not Applied');
      }
    });
  }

  createSeries = (value: string, name: string) => {
    const series = this.chart.series.push(new am4charts.ColumnSeries());
    series.showOnInit = false;
    series.defaultState.transitionDuration = 0;
    series.hiddenState.transitionDuration = 0;
    series.dataFields.valueY = value;
    series.dataFields.categoryX = 'category';
    series.name = name;
    series.strokeWidth = 0;

    series.columns.template.adapter.add('fill', () => {
      if (series.dataFields.valueY && series.dataFields.valueY === 'active') {
        return am4core.color('#4949FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'deactivated'
      ) {
        return am4core.color('#7879FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'terminated'
      ) {
        return am4core.color('#A3A3FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'pending'
      ) {
        return am4core.color('#BFBFFF');
      }

      if (series.dataFields.valueY && series.dataFields.valueY === 'licencee') {
        return am4core.color('#4949FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'partner'
      ) {
        return am4core.color('#7879FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'hosted'
      ) {
        return am4core.color('#A3A3FF');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'notApplied'
      ) {
        return am4core.color('#BFBFFF');
      }

      if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'accessibleApps'
      ) {
        return am4core.color('#344D90');
      } else if (
        series.dataFields.valueY &&
        series.dataFields.valueY === 'groupMembers'
      ) {
        return am4core.color('#5CC5EF');
      }
      return am4core.color('#cccccc');
    });

    series.events.on('hidden', this.arrangeColumns);
    series.events.on('shown', this.arrangeColumns);

    const bullet = series.bullets.push(new am4charts.LabelBullet());
    bullet.interactionsEnabled = false;
    bullet.dy = 30;
    bullet.label.text = '{valueY}';
    bullet.label.fontSize = 20;
    bullet.label.fill = am4core.color('#ffffff');

    return series;
  };

  arrangeColumns = () => {
    const series = this.chart.series.getIndex(0);
    const w =
      1 -
      this.xAxis.renderer.cellStartLocation -
      (1 - this.xAxis.renderer.cellEndLocation);

    if (series!.dataItems.length > 1) {
      const dataItem0 = series!.dataItems.getIndex(0);
      const dataItem1 = series!.dataItems.getIndex(1);

      if (!dataItem0 || !dataItem1) return;

      const x0 = this.xAxis.getX(dataItem0, 'categoryX');
      const x1 = this.xAxis.getX(dataItem1, 'categoryX');
      const delta = ((x1 - x0) / this.chart.series.length) * w;

      if (am4core.isNumber(delta)) {
        const middle = this.chart.series.length / 2;
        let newIndex = 0;
        this.chart.series.each(
          (series: { isHidden: any; isHiding: any; dummyData: any }) => {
            if (!series.isHidden && !series.isHiding) {
              series.dummyData = newIndex;
              newIndex++;
            } else {
              series.dummyData = this.chart.series.indexOf(series as any);
            }
          }
        );
        const visibleCount = newIndex;
        const newMiddle = visibleCount / 2;
        this.chart.series.each(
          (series: {
            dummyData: any;
            animate: (
              arg0: { property: string; to: number },
              arg1: any,
              arg2: any
            ) => void;
            interpolationDuration: any;
            interpolationEasing: any;
            bulletsContainer: {
              animate: (
                arg0: { property: string; to: number },
                arg1: any,
                arg2: any
              ) => void;
            };
          }) => {
            const trueIndex = this.chart.series.indexOf(series as any);
            const newIndex = series.dummyData;
            const dx = (newIndex - trueIndex + middle - newMiddle) * delta;
            series.animate(
              { property: 'dx', to: dx },
              series.interpolationDuration,
              series.interpolationEasing
            );
            series.bulletsContainer.animate(
              { property: 'dx', to: dx },
              series.interpolationDuration,
              series.interpolationEasing
            );
          }
        );
      }
    }
  };

  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.chart) {
        this.chart.dispose();
      }
    });
  }
}

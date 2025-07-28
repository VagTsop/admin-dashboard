import {
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'line-graph-chart',
  templateUrl: './line-graph-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class LineGraphChartComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  private chart: any;
  private isViewInitialized = false;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    if (this.data) this.initChart();
  }

  ngOnChanges(): void {
    if (this.isViewInitialized && this.chart && this.data) {
      this.chart.data = this.data;
    }
  }

  private initChart(): void {
    if (!this.diagramRef || this.chart) return;
    am4core.options.autoSetClassName = true;
    this.zone.runOutsideAngular(() => {
      am4core.useTheme(am4themes_animated);

      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.XYChart
      );

      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      const dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
      dateAxis.renderer.labels.template.fontSize = 20;
      dateAxis.startLocation = 0.5;
      dateAxis.endLocation = 1.2;

      const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      valueAxis.renderer.minGridDistance = 20;
      valueAxis.title.fontSize = 20;
      valueAxis.renderer.labels.template.fontSize = 20;
      valueAxis.renderer.grid.template.stroke = '#ffffff';

      const topContainer = this.chart.chartContainer.createChild(
        am4core.Container
      );
      topContainer.layout = 'absolute';
      topContainer.toBack();
      topContainer.width = am4core.percent(100);

      const createLineSeries = (
        dateValue: string,
        valueY: string,
        seriesName: string,
        strokeColor: string
      ) => {
        const lineSeries = this.chart!.series.push(new am4charts.LineSeries());
        lineSeries.showOnInit = false;
        lineSeries.tooltip.animationDuration = 0;
        lineSeries.dataFields.valueY = valueY;
        lineSeries.dataFields.dateX = dateValue;
        lineSeries.name = seriesName;
        lineSeries.strokeWidth = 2;
        lineSeries.stroke = strokeColor;
        lineSeries.tensionX = 0.7;
        lineSeries.tooltipText = '{name}\n[font-size: 12]{valueY}[/]';
        return lineSeries;
      };

      const addBulletsOnSeries = (
        series: { bullets: am4charts.CircleBullet[] },
        color: string
      ) => {
        const bullet = series.bullets.push(new am4charts.CircleBullet()) as any;
        bullet.circle.radius = 3;
        bullet.circle.strokeWidth = 2;
        bullet.circle.fill = color;
        return bullet;
      };

      const addColorOnText = (valueLabel: { label: { fill: string } }) => {
        valueLabel.label.fill = '#fff';
        return '#fff';
      };

      const displayLabelOnLastBullet = (series: { bullets: any[] }) => {
        const valueLabel = series.bullets.push(
          new am4charts.LabelBullet()
        ) as any;
        valueLabel.label.fontSize = 18;
        valueLabel.disabled = true;
        valueLabel.propertyFields.disabled = 'bulletDisabled';
        valueLabel.label.text = '[font-size: 12]{valueY}[/]%';
        valueLabel.horizontalCenter = 'left';
        valueLabel.label.horizontalCenter = 'left';
        valueLabel.label.paddingLeft = 10;
        return valueLabel;
      };

      const processLineGraphChartData = (data: any) => {
        this.chart!.data = data;
        dateAxis.renderer.minGridDistance = 60;

        if (
          this.cardTitle === 'Assigned Processes' ||
          this.cardTitle === 'Entities in Numbers' ||
          this.cardTitle === 'Account Actions' ||
          this.cardTitle === 'Process Executions'
        ) {
          valueAxis.title.text = this.cardTitle;
        } else {
          const title = topContainer.createChild(am4core.Label);
          title.text = this.cardTitle;
          title.align = 'center';
          title.fill = '#ffffff';
          title.dy = -15;
          title.fontSize = 25;
        }

        let objectKeysArray: string[] = [];
        this.chart!.data.forEach((data: { [x: string]: any }) => {
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              objectKeysArray.push(key);
            }
          }
        });
        const keyArrayUnique = new Set([...objectKeysArray]);
        objectKeysArray = Array.from(keyArrayUnique);
        const date = objectKeysArray.shift();
        if (!date) return;
        objectKeysArray.pop();
        let counter;
        for (let i = 0; i < objectKeysArray.length; i++) {
          counter = i;
          const lineSeries = createLineSeries(
            date,
            objectKeysArray[i],
            objectKeysArray[i],
            `rgb(${
              counter > 255
                ? (counter = 0)
                : counter === 0
                ? (counter = 4)
                : counter++ * 60
            }, ${
              counter > 255
                ? (counter = 0)
                : counter === 0
                ? (counter = 143)
                : counter++ * 20
            }, ${
              i > 255
                ? (counter = 0)
                : counter === 0
                ? (counter = 208)
                : counter++ * 40
            })`
          );
          if (
            this.cardTitle === 'Deployed Processes' ||
            this.cardTitle === 'User Registration Requests'
          ) {
            lineSeries.fillOpacity = 1;
            lineSeries.fill = lineSeries.stroke;
          }
          if (this.cardTitle === 'Deployed Processes') {
            const fillModifier = new am4core.LinearGradientModifier() as any;
            fillModifier.opacities = [0.6, 0.3, 0.1];
            fillModifier.lightnesses = [0.6, 0.3, 0.1];
            fillModifier.gradient.rotation = 90;
            lineSeries.segments.template.fillModifier = fillModifier;
          }
          if (this.cardTitle !== 'User Registration Requests') {
            addBulletsOnSeries(lineSeries, '#fff');
            const valueLabel = displayLabelOnLastBullet(lineSeries);
            addColorOnText(valueLabel);
          }
        }
        this.chart!.cursor = new am4charts.XYCursor();
      };

      processLineGraphChartData(this.data);
    });
  }

  ngOnDestroy(): void {
    this.zone.runOutsideAngular(() => {
      if (this.chart) {
        this.chart.dispose();
      }
    });
  }
}

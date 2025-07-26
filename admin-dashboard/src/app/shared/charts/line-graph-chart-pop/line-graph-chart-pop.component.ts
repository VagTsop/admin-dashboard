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
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'line-graph-chart-pop',
  templateUrl: './line-graph-chart-pop.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class LineGraphChartPopComponent
  implements OnInit, OnDestroy, OnChanges
{
  private chart: any;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: string;
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
      const dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
      dateAxis.renderer.labels.template.fontSize = 10;
      dateAxis.startLocation = 0.5;
      dateAxis.endLocation = 1.2;

      const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      valueAxis.renderer.minGridDistance = 20;
      valueAxis.title.fontSize = 12;
      valueAxis.renderer.labels.template.fontSize = 10;
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
        const lineSeries = this.chart.series.push(new am4charts.LineSeries());
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

      const getRanHex = (size: number) => {
        const result = [];
        const hexRef = [
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
        ];
        for (let n = 0; n < size; n++) {
          result.push(hexRef[Math.floor(Math.random() * 16)]);
        }
        return result.join('');
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
        let textColor: string;
        textColor = '#fff';
        valueLabel.label.fill = textColor;
        return textColor;
      };

      const displayLabelOnLastBullet = (series: { bullets: any[] }) => {
        const valueLabel = series.bullets.push(
          new am4charts.LabelBullet()
        ) as any;
        valueLabel.label.fontSize = 12;
        valueLabel.disabled = true;
        valueLabel.propertyFields.disabled = 'bulletDisabled';
        valueLabel.label.text = '[font-size: 12]{valueY}[/]%';
        valueLabel.horizontalCenter = 'left';
        valueLabel.label.horizontalCenter = 'left';
        valueLabel.label.paddingLeft = 10;
        return valueLabel;
      };

      const processLineGraphChartData = (data: string) => {
        this.chart.data = data;
        dateAxis.renderer.minGridDistance = 60;
        valueAxis.title.text = this.cardTitle;
        // 1. create an array
        let objectKeysArray: string[] = []; // 2. loop chart data array of object
        this.chart.data.forEach((data: { [x: string]: any }) => {
          // tslint:disable-next-line: forin
          // 3. and for each object get keys and push into keyArray
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              objectKeysArray.push(key);
            }
          }
        });
        // 4. create a set with keyArray inside Set constructor to remove all duplicate keys
        const keyArrayUnique = new Set([...objectKeysArray]);
        // 5. Convert Set back to Array
        objectKeysArray = Array.from(keyArrayUnique);
        // 6. Remove first element from the array - 'date'
        const date = objectKeysArray.shift();
        if (!date) return; // or throw new Error('Missing date field');
        // 7. Remove last element from the array - 'bulletDisabled'
        objectKeysArray.pop();

        // 8. loop array with unique keys and for each unique key create a line
        for (let i = 0; i < objectKeysArray.length; i++) {
          const lineSeries = createLineSeries(
            date,
            objectKeysArray[i],
            objectKeysArray[i],
            getRanHex(6)
          );
          addBulletsOnSeries(lineSeries, '#fff');

          const valueLabel = displayLabelOnLastBullet(lineSeries);

          addColorOnText(valueLabel);
        }
        this.chart.cursor = new am4charts.XYCursor();
      };

      processLineGraphChartData(this.data);
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

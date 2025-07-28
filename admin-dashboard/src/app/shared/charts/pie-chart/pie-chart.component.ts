import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  Renderer2,
  ViewEncapsulation,
  OnChanges,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'pie-chart',
  templateUrl: './pie-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  styleUrls: ['../../../../styles/general.component.scss'],

  encapsulation: ViewEncapsulation.None,
})
export class AmChartsPieChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;
  private initialized = false;

  private chart: any;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.initialized = true;
    if (this.data) {
      this.createChart();
    }
  }

  ngOnChanges() {
    if (this.initialized && this.data) {
      this.createChart();
    }
  }

  private createChart() {
    am4core.options.autoSetClassName = true;
    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.PieChart
      );

      am4core.useTheme(am4themes_animated);

      this.renderer.removeChild(this.chart, this.chart.logo.dom);
      const pieSeries = this.chart.series.push(new am4charts.PieSeries());

      const createLegend = (identifier: string) => {
        this.chart.legend = new am4charts.Legend();
        this.chart.legend.labels.template.fill = am4core.color('#ffffff');
        this.chart.legend.valueLabels.template.text =
          "{value.percent.formatNumber('')}";

        const markerTemplate = this.chart.legend.markers.template;
        markerTemplate.width = 11;
        markerTemplate.height = 11;

        if (identifier === 'Subscription Policies') {
          this.chart.legend.labels.template.fontSize = 18;
          this.chart.legend.position = 'left';
          this.chart.legend.valign = 'top';
        }

        if (identifier === 'Activations') {
          this.chart.legend.layout = 'horizontal';
          this.chart.legend.position = 'bottom';
          this.chart.legend.contentAlign = 'center';
          this.chart.legend.itemContainers.template.margin(0, 2, 0, 0);
          this.chart.legend.itemContainers.template.padding(0, 0, 0, 3);
          this.chart.legend.height = 15;
          this.chart.legend.itemContainers.template.width = 65;
        }
      };
      const createSliceSeries = (
        category: string,
        value: string,
        color: string
      ) => {
        pieSeries.dataFields.value = value;
        pieSeries.dataFields.category = category;
        pieSeries.slices.template.strokeWidth = 2;
        pieSeries.slices.template.propertyFields.fill = color;
        pieSeries.ticks.template.disabled = true;
        pieSeries.labels.template.text = "{value.percent.formatNumber('')}";

        if (
          this.cardTitle === 'Nodes' ||
          this.cardTitle === 'Beneficiaries' ||
          this.cardTitle === 'Users' ||
          this.cardTitle === 'Conversation Contracts' ||
          this.cardTitle === 'Collaborations' ||
          this.cardTitle === 'Collaboration Enrollements'
        ) {
          this.chart.innerRadius = am4core.percent(75);
          this.chart.responsive.rules.push({
            relevant: function (target: any) {
              if (target.pixelWidth <= 200 && target.pixelWidth >= 1) {
                return true;
              }
              return false;
            },
            state: function (target: any, stateId: string) {
              if (target instanceof am4charts.PieChart) {
                const state = target.states.create(stateId);
                state.properties.radius = 45;
                state.properties.innerRadius = 35;
                return state;
              }
              return null;
            },
          });
          this.chart.responsive.rules.push({
            relevant: function (target: any) {
              if (target.pixelWidth >= 201 && target.pixelWidth <= 301) {
                return true;
              }
              return false;
            },
            state: function (target: any, stateId: string) {
              if (target instanceof am4charts.PieChart) {
                const state = target.states.create(stateId);
                state.properties.radius = 50;
                state.properties.innerRadius = 40;
                return state;
              }
              return null;
            },
          });
        }
        if (this.cardTitle === 'Subscription Policies') {
          createLegend('Subscription Policies');
          this.chart.paddingRight = 100;

          pieSeries.slices.template.stroke = am4core.color('#fff');
          pieSeries.slices.template.strokeOpacity = 1;
          pieSeries.alignLabels = false;
          pieSeries.labels.template.text =
            "{value.percent.formatNumber('#.0')}%";
          pieSeries.labels.template.radius = am4core.percent(-40);
          pieSeries.labels.template.fill = am4core.color('white');
        }
        if (this.cardTitle === 'Activations') {
          createLegend('Activations');
          this.chart.radius = am4core.percent(95);
        }
      };

      const processPieChartData = (data: string) => {
        this.chart.data = data;
        let objectKeysArray: string[] = [];
        this.chart.data.forEach((data: { [x: string]: any }) => {
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              objectKeysArray.push(key);
            }
          }
        });
        const keyArrayUnique = new Set([...objectKeysArray]);
        objectKeysArray = Array.from(keyArrayUnique);
        let counter;
        for (let i = 0; i < objectKeysArray.length; i++) {
          counter = i;
          createSliceSeries(
            objectKeysArray[0],
            objectKeysArray[1],
            objectKeysArray[2] ||
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
        }
      };
      processPieChartData(this.data);
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

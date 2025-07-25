import { Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  AfterViewInit,
  Renderer2,
} from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { AmChartsLogo } from '@amcharts/amcharts4/.internal/core/elements/AmChartsLogo';
import { chartSharedImports } from '../../chart-shared-imports';

@Component({
  selector: 'gauge-chart',
  templateUrl: './gauge-chart.component.html',
  standalone: true,
  imports: [chartSharedImports],
  encapsulation: ViewEncapsulation.None,
})
export class GaugeChartComponent implements OnInit, AfterViewInit, OnDestroy {
  private chart: any;

  @Input() cardTitle!: string;
  @Input() identifier!: string;
  @Input() data!: any;
  @ViewChild('diagramDiv') private diagramRef!: ElementRef;

  constructor(private zone: NgZone, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(
        this.diagramRef.nativeElement,
        am4charts.GaugeChart
      );

      am4core.useTheme(am4themes_animated);
      // remove logo from display
      this.renderer.removeChild(this.chart, this.chart.logo.dom);

      this.chart.radius = am4core.percent(85);
      this.chart.innerRadius = am4core.percent(70);

      const axis = this.chart.xAxes.push(new am4charts.ValueAxis());
      axis.min = 0;
      axis.max = 100;
      axis.strictMinMax = true;
      axis.renderer.radius = am4core.percent(80);
      axis.renderer.inside = true;
      axis.disabled = true;
      axis.renderer.line.strokeOpacity = 1;
      axis.renderer.ticks.template.disabled = false;
      axis.renderer.ticks.template.strokeOpacity = 1;
      axis.renderer.ticks.template.length = 10;
      axis.renderer.grid.template.disabled = true;
      axis.renderer.labels.template.radius = 40;
      const label = this.chart.radarContainer.createChild(am4core.Label);
      label.isMeasured = false;
      label.fontSize = 12;
      label.fill = am4core.color('white');
      label.x = am4core.percent(50);
      label.y = am4core.percent(100);
      label.horizontalCenter = 'middle';
      label.verticalCenter = 'bottom';
      label.text = '50%';

      const colorSet = new am4core.ColorSet();

      const axis2 = this.chart.xAxes.push(new am4charts.ValueAxis());
      axis2.min = 0;
      axis2.max = 100;
      axis2.strictMinMax = true;
      axis2.renderer.labels.template.disabled = true;
      axis2.renderer.ticks.template.disabled = true;
      axis2.renderer.grid.template.disabled = true;

      const range0 = axis2.axisRanges.create();
      range0.value = 0;
      range0.endValue = 50;
      range0.axisFill.fillOpacity = 1;
      range0.axisFill.fill = colorSet.getIndex(0);

      const range1 = axis2.axisRanges.create();
      range1.value = 50;
      range1.endValue = 100;
      range1.axisFill.fillOpacity = 1;
      range1.axisFill.fill = colorSet.getIndex(2);

      const hand = this.chart.hands.push(new am4charts.ClockHand());
      hand.axis = axis2;
      hand.innerRadius = am4core.percent(20);
      hand.startWidth = 10;
      hand.pin.disabled = true;
      hand.value = 50;

      hand.events.on('propertychanged', function (ev: any) {
        range0.endValue = ev.target.value;
        range1.value = ev.target.value;
        label.text = axis2.positionToValue(hand.currentPosition).toFixed(1);
        axis2.invalidate();
      });

      setInterval(function () {
        const value = Math.round(Math.random() * 100);
        const animation = new am4core.Animation(
          hand,
          {
            property: 'value',
            to: value,
          },
          1000,
          am4core.ease.cubicOut
        ).start();
      }, 2000);
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

import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Explicit registration keeps ECharts tree-shakeable — only the chart types and
 * components listed here reach the bundle. Importing `echarts` wholesale would
 * add roughly a megabyte for features this dashboard never renders.
 *
 * CanvasRenderer (not SVG) is deliberate: the revenue chart draws 730 points
 * with a live tail, and canvas keeps that at a stable frame budget.
 */
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  MarkLineComponent,
  DatasetComponent,
  CanvasRenderer,
]);

export { echarts };
export type { EChartsType } from 'echarts/core';
export type { EChartsOption } from 'echarts';

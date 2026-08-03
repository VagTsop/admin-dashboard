import { EChartsOption } from './echarts.setup';

/**
 * Bridges the CSS design tokens into ECharts.
 *
 * Charts read the same custom properties as the rest of the UI, so a token
 * change in `styles.scss` propagates to the canvas with no duplicated palette
 * to keep in sync.
 */
export interface ChartTokens {
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  surface: string;
  border: string;
  grid: string;
  accent: string;
  positive: string;
  negative: string;
  warning: string;
  viz: string[];
  fontFamily: string;
}

export function readChartTokens(): ChartTokens {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();

  return {
    fg: v('--fg'),
    fgMuted: v('--fg-muted'),
    fgSubtle: v('--fg-subtle'),
    surface: v('--surface'),
    border: v('--border'),
    grid: v('--grid-line'),
    accent: v('--accent'),
    positive: v('--positive'),
    negative: v('--negative'),
    warning: v('--warning'),
    viz: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--viz-${i}`)),
    fontFamily: v('--font-sans'),
  };
}

/** Shared chrome: tooltip, grid insets and axis treatment. */
export function baseOption(t: ChartTokens): EChartsOption {
  return {
    animationDuration: 420,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: t.fontFamily, fontSize: 11 },
    grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: t.fg, fontSize: 12 },
      extraCssText: 'border-radius:10px;box-shadow:0 12px 32px -12px rgba(0,0,0,.5);',
      axisPointer: {
        type: 'line',
        lineStyle: { color: t.border, width: 1 },
      },
    },
  };
}

export function categoryAxis(t: ChartTokens, data: string[]) {
  return {
    type: 'category' as const,
    data,
    boundaryGap: false,
    axisLine: { lineStyle: { color: t.border } },
    axisTick: { show: false },
    axisLabel: {
      color: t.fgSubtle,
      fontSize: 10,
      hideOverlap: true,
      margin: 10,
    },
  };
}

export function valueAxis(t: ChartTokens, formatter?: (v: number) => string) {
  return {
    type: 'value' as const,
    splitLine: { lineStyle: { color: t.grid } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: t.fgSubtle,
      fontSize: 10,
      formatter: formatter as never,
    },
  };
}

/** Vertical fade used under area series. */
export function areaFade(color: string, from = 0.28, to = 0) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, from) },
      { offset: 1, color: withAlpha(color, to) },
    ],
  };
}

/** Accepts hex or rgb tokens and returns an rgba() string. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const int = parseInt(full, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const nums = color.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return color;
  return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
}

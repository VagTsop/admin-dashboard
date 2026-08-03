/** Intl formatters are expensive to construct — build once, reuse forever. */

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullNumber = new Intl.NumberFormat('en-US');

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const signedPercent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

const dayMonth = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const time = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const fmt = {
  currency: (v: number) => fullCurrency.format(v),
  currencyCompact: (v: number) => compactCurrency.format(v),
  number: (v: number) => fullNumber.format(v),
  numberCompact: (v: number) => compactNumber.format(v),
  percent: (v: number) => percent.format(v),
  delta: (v: number) => signedPercent.format(v),
  day: (t: number) => dayMonth.format(t),
  time: (t: number) => time.format(t),
  relative: (t: number) => {
    const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  },
};

/** Formats a KPI value according to its declared unit. */
export function formatKpi(
  value: number,
  format: 'currency' | 'number' | 'percent'
): string {
  switch (format) {
    case 'currency':
      return fmt.currencyCompact(value);
    case 'percent':
      return fmt.percent(value);
    default:
      return fmt.numberCompact(value);
  }
}

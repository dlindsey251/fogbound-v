export const METRIC_PERIOD_START = '2026-07-08';
export const METRIC_PERIOD_LABEL = 'Since Jul 8';

export function periodMetricKey(name) {
  return `fogbound_metric_period_${METRIC_PERIOD_START}_${name}`;
}

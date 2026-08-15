const LS_VISITOR_ID = 'fogbound_visitor_id';
const LS_METRICS_OPT_OUT = 'fogbound_metrics_opt_out';

export function isMetricsOptedOut() {
  return localStorage.getItem(LS_METRICS_OPT_OUT) === '1';
}

export function setMetricsOptOut(optedOut) {
  if (optedOut) localStorage.setItem(LS_METRICS_OPT_OUT, '1');
  else localStorage.removeItem(LS_METRICS_OPT_OUT);
}

export function getVisitorId() {
  const existing = localStorage.getItem(LS_VISITOR_ID);
  if (existing) return existing;
  const id = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(LS_VISITOR_ID, id);
  return id;
}

export function trackMetric(eventType, detail = {}) {
  if (isMetricsOptedOut()) return;

  const body = {
    visitorId: getVisitorId(),
    eventType,
    ...detail,
  };

  fetch('/api/metrics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

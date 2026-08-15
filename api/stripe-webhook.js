import Stripe from 'stripe';
import { kvCommand } from './_kv.js';
import { sendArtifactEmail, storeEmail, trackArchiveAcquire } from './artifact-email.js';
import { periodMetricKey } from './_metric-period.js';
import { createClaim, grantEntitlement } from './_archive-access.js';

const PURCHASE_ITEMS = new Set(['ben-story', 'nested-dolls', '18-21', 'soundtrack-bundle', 'entry1']);

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (Buffer.isBuffer(req.body)) return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fulfillCheckoutSession(session, origin) {
  const artifactId = String(session.metadata?.artifactId || '').trim().toLowerCase();
  if (!PURCHASE_ITEMS.has(artifactId)) return;

  const added = await kvCommand('sadd', 'fogbound_stripe_fulfilled_sessions', session.id);
  if (added !== 1) return;

  const email = String(session.customer_details?.email || session.customer_email || '').trim();
  if (!email) throw new Error(`Checkout session ${session.id} is missing customer email.`);

  await storeEmail(email);
  await grantEntitlement(email, artifactId, {
    sessionId: session.id,
    customerId: session.customer,
  });
  const claimToken = await createClaim(email);
  const archiveReturnUrl = claimToken
    ? `${origin}/api/archive-claim?token=${encodeURIComponent(claimToken)}`
    : origin;
  const emailed = await sendArtifactEmail(email, origin, artifactId, archiveReturnUrl);
  const metricCommands = artifactId === 'soundtrack-bundle'
    ? [
        kvCommand('incr', 'fogbound_metric_soundtrack_purchase_total'),
        kvCommand('incr', 'fogbound_metric_soundtrack_purchase_bundle'),
        kvCommand('incr', periodMetricKey('soundtrack_purchase_total')),
        kvCommand('incr', periodMetricKey('soundtrack_purchase_bundle')),
      ]
    : [
        trackArchiveAcquire(email, artifactId),
        kvCommand('incr', 'fogbound_metric_archive_purchase_total'),
        kvCommand('incr', `fogbound_metric_archive_purchase_${artifactId}`),
        kvCommand('incr', periodMetricKey('archive_purchase_total')),
        kvCommand('incr', periodMetricKey(`archive_purchase_${artifactId}`)),
      ];
  await Promise.all(metricCommands);
  return emailed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return json(res, 503, { ok: false, error: 'Stripe webhook is not configured.' });
  }

  const stripe = new Stripe(secretKey);
  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return json(res, 400, { ok: false, error: `Webhook signature failed: ${err?.message || 'invalid'}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        await fulfillCheckoutSession(session, getOrigin(req));
      }
    }
    return json(res, 200, { received: true });
  } catch (err) {
    console.error('Stripe fulfillment failed:', err);
    return json(res, 500, { ok: false, error: err?.message || 'Fulfillment failed.' });
  }
}

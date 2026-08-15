import Stripe from 'stripe';
import {
  PURCHASE_ARTIFACTS,
  clearArchiveCookie,
  createArchiveSession,
  getArchiveOwner,
  grantEntitlement,
  listEntitlements,
  setArchiveCookie,
} from './_archive-access.js';

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_err) {
      return {};
    }
  }
  return req.body || {};
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const owner = await getArchiveOwner(req);
      const entitlements = await listEntitlements(owner);
      return json(res, 200, { ok: true, recognized: entitlements.length > 0, entitlements });
    }

    if (req.method === 'DELETE') {
      clearArchiveCookie(res);
      return json(res, 200, { ok: true });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const sessionId = String(getBody(req).sessionId || '').trim();
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!sessionId || !secretKey) {
      return json(res, 400, { ok: false, error: 'Purchase session is unavailable' });
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const artifactId = String(session.metadata?.artifactId || '').trim().toLowerCase();
    const email = String(session.customer_details?.email || session.customer_email || '').trim();
    if (
      session.payment_status !== 'paid'
      || !PURCHASE_ARTIFACTS.has(artifactId)
      || !email
    ) {
      return json(res, 403, { ok: false, error: 'Paid purchase could not be verified' });
    }

    const owner = await grantEntitlement(email, artifactId, {
      sessionId: session.id,
      customerId: session.customer,
    });
    const token = await createArchiveSession(owner);
    setArchiveCookie(res, token);
    const entitlements = await listEntitlements(owner);
    return json(res, 200, { ok: true, recognized: true, entitlements });
  } catch (err) {
    console.error('Archive session failed:', err);
    return json(res, 500, { ok: false, error: 'The archive could not verify this purchase' });
  }
}

import Stripe from 'stripe';
import {
  PURCHASE_ARTIFACTS,
  createClaim,
  emailKey,
  grantEntitlement,
  listEntitlements,
  normalizeEmail,
} from './_archive-access.js';
import { sendArchiveRestoreEmail } from './artifact-email.js';

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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

async function recoverStripePurchases(email) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return;
  const stripe = new Stripe(secretKey);
  const customers = await stripe.customers.list({ email, limit: 100 });
  for (const customer of customers.data) {
    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      status: 'complete',
      limit: 100,
    });
    for (const session of sessions.data) {
      const artifactId = String(session.metadata?.artifactId || '').trim().toLowerCase();
      if (session.payment_status !== 'paid' || !PURCHASE_ARTIFACTS.has(artifactId)) continue;
      await grantEntitlement(email, artifactId, {
        sessionId: session.id,
        customerId: customer.id,
      });
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const email = normalizeEmail(getBody(req).email);
  const response = {
    ok: true,
    message: 'If the archive recognizes that address, a return path has been sent.',
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 200, response);
  }

  try {
    let entitlements = await listEntitlements(emailKey(email));
    if (!entitlements.length) {
      await recoverStripePurchases(email);
      entitlements = await listEntitlements(emailKey(email));
    }
    if (entitlements.length) {
      const claimToken = await createClaim(email);
      const returnUrl = `${getOrigin(req)}/api/archive-claim?token=${encodeURIComponent(claimToken)}`;
      await sendArchiveRestoreEmail(email, returnUrl);
    }
  } catch (err) {
    console.error('Archive restore failed:', err);
  }
  return json(res, 200, response);
}

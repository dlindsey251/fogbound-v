import Stripe from 'stripe';

const PURCHASE_ITEMS = {
  'ben-story': {
    name: "Ben's Story",
    priceEnv: 'STRIPE_PRICE_BEN_STORY',
  },
  'nested-dolls': {
    name: 'Nested Dolls',
    priceEnv: 'STRIPE_PRICE_NESTED_DOLLS',
  },
  '18-21': {
    name: '18:21',
    unitAmount: 499,
    currency: 'usd',
  },
  'soundtrack-bundle': {
    name: 'Fogbound V Soundtrack',
    priceEnv: 'STRIPE_PRICE_SOUNDTRACK',
  },
  entry1: {
    name: 'What Lies in the Fog',
    flexibleAmount: true,
    currency: 'usd',
  },
};

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

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return json(res, 503, { ok: false, error: 'Payments are not configured yet.' });
    }

    const body = getBody(req);
    const artifactId = String(body.artifactId || '').trim().toLowerCase();
    const item = PURCHASE_ITEMS[artifactId];
    if (!item) return json(res, 400, { ok: false, error: 'This item is not available for purchase.' });

    const price = item.priceEnv ? process.env[item.priceEnv] : null;
    if (item.priceEnv && !price) {
      return json(res, 503, { ok: false, error: `${item.name} does not have a Stripe price yet.` });
    }

    const email = String(body.email || '').trim();
    const requestedAmount = Number(body.amountCents);
    const unitAmount = item.flexibleAmount
      ? Math.round(requestedAmount)
      : item.unitAmount;
    if (item.flexibleAmount && (!Number.isFinite(unitAmount) || unitAmount < 100 || unitAmount > 10000)) {
      return json(res, 400, {
        ok: false,
        error: 'Choose a contribution between $1 and $100.',
      });
    }
    const origin = getOrigin(req);
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      line_items: [{
        ...(price
          ? { price }
          : {
              price_data: {
                currency: item.currency,
                unit_amount: unitAmount,
                product_data: { name: item.name },
              },
            }),
        quantity: 1,
      }],
      customer_email: isEmail(email) ? email : undefined,
      customer_creation: 'always',
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === '1' },
      metadata: {
        artifactId,
        itemName: item.name,
        contributionAmount: item.flexibleAmount ? String(unitAmount) : '',
      },
      return_url: `${origin}/?checkout=complete&artifact=${encodeURIComponent(artifactId)}&session_id={CHECKOUT_SESSION_ID}`,
    });

    return json(res, 200, { ok: true, clientSecret: session.client_secret });
  } catch (err) {
    console.error('Checkout session creation failed:', err);
    return json(res, 500, {
      ok: false,
      error: 'Payments are not fully configured yet.',
    });
  }
}

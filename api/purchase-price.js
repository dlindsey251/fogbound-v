import Stripe from 'stripe';

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const artifactId = String(req.query?.artifactId || '').trim().toLowerCase();
  if (artifactId !== 'soundtrack-bundle') {
    return json(res, 400, { ok: false, error: 'Unknown purchase item' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_SOUNDTRACK;
  if (!secretKey || !priceId) {
    return json(res, 503, { ok: false, error: 'Price is not configured' });
  }

  try {
    const stripe = new Stripe(secretKey);
    const price = await stripe.prices.retrieve(priceId);
    if (!Number.isFinite(price.unit_amount)) {
      return json(res, 422, { ok: false, error: 'Price amount is unavailable' });
    }
    res.setHeader(
      'cache-control',
      'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    );
    return json(res, 200, {
      ok: true,
      unitAmount: price.unit_amount,
      currency: price.currency,
      livemode: Boolean(price.livemode),
    });
  } catch (_err) {
    return json(res, 502, { ok: false, error: 'Could not retrieve price' });
  }
}

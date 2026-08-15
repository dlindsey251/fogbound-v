import { kvGet, kvSet } from './_kv.js';

const RESET_KEY = 'fogbound_global_reset_epoch';
const DEPLOYED_RESET_EPOCH = '2026-06-02-ben-first-visit-reset';

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const epoch = await kvGet(RESET_KEY);
      return json(res, 200, { ok: true, epoch: epoch ? String(epoch) : DEPLOYED_RESET_EPOCH });
    } catch (err) {
      return json(res, 200, {
        ok: true,
        epoch: DEPLOYED_RESET_EPOCH,
        storageAvailable: false,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const pass = (req.body?.passcode ?? '').trim();
      const expected = (process.env.GLOBAL_RESET_PASSCODE || '').trim();
      if (!expected) return json(res, 500, { ok: false, error: 'Server passcode is not configured' });
      if (pass.toLowerCase() !== expected.toLowerCase()) {
        return json(res, 403, { ok: false, error: 'Invalid passcode' });
      }

      const epoch = String(Date.now());
      await kvSet(RESET_KEY, epoch);
      return json(res, 200, { ok: true, epoch });
    } catch (err) {
      return json(res, 500, { ok: false, error: err?.message || 'Failed to update reset epoch' });
    }
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}

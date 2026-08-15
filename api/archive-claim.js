import {
  createArchiveSession,
  listEntitlements,
  redeemClaim,
  setArchiveCookie,
} from './_archive-access.js';

export default async function handler(req, res) {
  const token = String(req.query?.token || '').trim();
  try {
    const owner = await redeemClaim(token);
    const entitlements = await listEntitlements(owner);
    if (!owner || !entitlements.length) {
      res.status(302).setHeader('location', '/?archive=unrecognized');
      return res.end();
    }
    const sessionToken = await createArchiveSession(owner);
    setArchiveCookie(res, sessionToken);
    res.status(302).setHeader('location', '/?archive=restored');
    return res.end();
  } catch (_err) {
    res.status(302).setHeader('location', '/?archive=unrecognized');
    return res.end();
  }
}

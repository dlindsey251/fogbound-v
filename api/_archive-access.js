import crypto from 'node:crypto';
import { kvCommand } from './_kv.js';

export const ARCHIVE_COOKIE = 'fogbound_archive_session';
export const PURCHASE_ARTIFACTS = new Set([
  'ben-story',
  'nested-dolls',
  '18-21',
  'soundtrack-bundle',
  'entry1',
]);

const SESSION_SECONDS = 60 * 60 * 24 * 365;
const CLAIM_SECONDS = 60 * 60 * 24 * 30;

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function emailKey(email) {
  return digest(normalizeEmail(email));
}

export function parseCookies(req) {
  return String(req.headers?.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return cookies;
      cookies[part.slice(0, separator)] = decodeURIComponent(part.slice(separator + 1));
      return cookies;
    }, {});
}

export function setArchiveCookie(res, token) {
  res.setHeader(
    'set-cookie',
    `${ARCHIVE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
  );
}

export function clearArchiveCookie(res) {
  res.setHeader(
    'set-cookie',
    `${ARCHIVE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
}

export async function grantEntitlement(email, artifactId, detail = {}) {
  const normalized = normalizeEmail(email);
  const artifact = String(artifactId || '').trim().toLowerCase();
  if (!normalized || !PURCHASE_ARTIFACTS.has(artifact)) return null;

  const owner = emailKey(normalized);
  await Promise.all([
    kvCommand('sadd', `fogbound_archive_entitlements_${owner}`, artifact),
    kvCommand('set', `fogbound_archive_entitlement_${owner}_${artifact}`, JSON.stringify({
      artifactId: artifact,
      grantedAt: new Date().toISOString(),
      sessionId: String(detail.sessionId || ''),
      customerId: String(detail.customerId || ''),
    })),
  ]);
  return owner;
}

export async function listEntitlements(owner) {
  if (!owner) return [];
  const artifacts = await kvCommand('smembers', `fogbound_archive_entitlements_${owner}`);
  return Array.isArray(artifacts)
    ? artifacts.filter((artifact) => PURCHASE_ARTIFACTS.has(artifact))
    : [];
}

export async function createArchiveSession(owner) {
  const token = randomToken();
  await kvCommand(
    'set',
    `fogbound_archive_session_${digest(token)}`,
    owner,
    'EX',
    SESSION_SECONDS,
  );
  return token;
}

export async function getArchiveOwner(req) {
  const token = parseCookies(req)[ARCHIVE_COOKIE];
  if (!token) return '';
  return String(await kvCommand('get', `fogbound_archive_session_${digest(token)}`) || '');
}

export async function createClaim(email) {
  const owner = emailKey(email);
  const entitlements = await listEntitlements(owner);
  if (!entitlements.length) return null;
  const token = randomToken();
  await kvCommand(
    'set',
    `fogbound_archive_claim_${digest(token)}`,
    owner,
    'EX',
    CLAIM_SECONDS,
  );
  return token;
}

export async function redeemClaim(token) {
  if (!token) return '';
  const key = `fogbound_archive_claim_${digest(token)}`;
  const owner = String(await kvCommand('get', key) || '');
  if (!owner) return '';
  await kvCommand('del', key);
  return owner;
}

import { kvGet, kvSet, kvCommand } from './_kv.js';
import { periodMetricKey } from './_metric-period.js';

const EMAILS_KEY = 'fogbound_artifact_emails';
const EVENTS_TOTAL_KEY = 'fogbound_metric_events_total';
const ARCHIVE_ITEMS = new Set(['ben-story', 'nested-dolls', '18-21', 'ibit', 'entry1']);
const NOTIFY_ITEMS = new Set(['18-21-notify']);

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

export async function storeEmail(email) {
  const raw = await kvGet(EMAILS_KEY);
  let entries = [];
  if (raw) {
    try {
      entries = JSON.parse(raw);
    } catch (_err) {
      entries = [];
    }
  }

  const normalized = email.toLowerCase();
  const existing = entries.find((entry) => entry.email === normalized);
  if (existing) {
    existing.updatedAt = new Date().toISOString();
  } else {
    entries.push({ email: normalized, createdAt: new Date().toISOString() });
  }
  await Promise.all([
    kvSet(EMAILS_KEY, JSON.stringify(entries)),
    kvCommand('incr', periodMetricKey('email_submission_total')),
    kvCommand('sadd', periodMetricKey('email_unique_total'), normalized),
  ]);
}

export function buildEmailPayload(artifactId, origin) {
  if (artifactId === 'ben-story') {
    return {
      subject: "Ben's Story",
      message: "Ben's Story is attached here as a path back into the fog.",
      artifacts: [
        { label: "Ben's Story", url: `${origin}/Fogbound%20V%20Entry%20Stories.pdf` },
      ],
    };
  }

  if (artifactId === 'nested-dolls') {
    return {
      subject: 'Nested Dolls',
      message: 'Nested Dolls is waiting beneath the next layer.',
      artifacts: [
        { label: 'Nested Dolls', url: `${origin}/Nested%20Dolls--.pdf` },
      ],
    };
  }

  if (artifactId === '18-21') {
    return {
      subject: '18:21',
      message: '18:21 is waiting for you beyond the fog.',
      artifacts: [
        { label: '18:21', url: `${origin}/Full%201821.pdf` },
      ],
    };
  }

  if (artifactId === 'ibit') {
    const artifacts = [
      { label: 'Guide To The Fog', url: `${origin}/Guide%20To%20The%20Fog.pdf` },
    ];
    return {
      subject: 'Ibit Shaw',
      message: 'Ibit Shaw... Could he really have been on to something?',
      artifacts,
    };
  }

  if (artifactId === 'entry1') {
    return {
      subject: 'What Lies In The Fog',
      message: 'What Lies In The Fog surfaced for you.',
      artifacts: [
        { label: 'What Lies In The Fog', url: `${origin}/What%20Lies%20In%20The%20Fog-%20Veil.pdf` },
        { label: 'Play the entire audio', url: `${origin}/What%20lies%20in%20the%20fog%20audio%20.mp3` },
      ],
    };
  }

  if (artifactId === 'soundtrack-bundle') {
    const companionUrl = `${origin}/Fogbound%20V%20Soundtrack%20Companion.pdf`;
    return {
      subject: 'Fogbound V Soundtrack',
      message: 'Carry. A memory uncovered...',
      attachments: [
        {
          path: companionUrl,
          filename: 'Carry.pdf',
        },
      ],
      artifacts: [
        { label: 'Carry — Soundtrack Companion', url: companionUrl },
        { label: "Parlez-Moi d'Amour", url: `${origin}/Parlez-Moi%20d%27Amour.wav` },
        { label: 'Ghosts', url: `${origin}/Ghosts.mp3` },
        { label: 'J Theme', url: `${origin}/JTheme.mp3` },
        { label: 'Kelly Theme', url: `${origin}/KellyTheme.mp3` },
        { label: 'Tail Theme', url: `${origin}/TailTheme.mp3` },
        { label: "18:21 (Gene's Theme)", url: `${origin}/18.21%28Gene%27s%29.wav` },
      ],
    };
  }

  return {
    subject: 'You entered the fog',
    message: 'You entered the fog and returned with their stories.',
    artifacts: [
      { label: "Ben's Story", url: `${origin}/Fogbound%20V%20Entry%20Stories.pdf` },
      { label: 'What lies in the fog audio .mp3', url: `${origin}/What%20lies%20in%20the%20fog%20audio%20.mp3` },
    ],
  };
}

export async function sendArtifactEmail(email, origin, artifactId, archiveReturnUrl = origin) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.ARTIFACT_EMAIL_FROM || 'Fogbound <onboarding@resend.dev>';
  const { subject, message, artifacts, attachments = [] } = buildEmailPayload(artifactId, origin);

  const htmlList = artifacts
    .map((artifact) => `<li><a href="${artifact.url}">${artifact.label}</a></li>`)
    .join('');
  const textList = artifacts
    .map((artifact, index) => `${index + 1}. ${artifact.label}: ${artifact.url}`)
    .join('\n');
  const returnUrl = archiveReturnUrl || origin;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject,
      attachments,
      text: `${message}\n\n${textList}\n\nYour Archive Key remembers this purchase.\nReturn to your archive: ${returnUrl}`,
      html: `
        <p>${message}</p>
        <ol>${htmlList}</ol>
        <p>Your Archive Key remembers this purchase across devices.</p>
        <p><a href="${returnUrl}">Return to your archive</a></p>
      `,
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Email send failed (${r.status}) ${body}`.trim());
  }

  return true;
}

export async function sendArchiveRestoreEmail(email, returnUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.ARTIFACT_EMAIL_FROM || 'Fogbound <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Fogbound Archive Key',
      text: `The archive remembers what belongs to you.\n\nReturn to your archive: ${returnUrl}\n\nThis link can be used once and expires in 30 days.`,
      html: `
        <p>The archive remembers what belongs to you.</p>
        <p><a href="${returnUrl}">Return to your archive</a></p>
        <p><small>This link can be used once and expires in 30 days.</small></p>
      `,
    }),
  });
  if (!r.ok) throw new Error(`Archive restore email failed (${r.status})`);
  return true;
}

export async function trackArchiveAcquire(email, artifactId) {
  if (!ARCHIVE_ITEMS.has(artifactId)) return;
  const normalized = email.toLowerCase();
  await Promise.all([
    kvCommand('incr', 'fogbound_metric_archive_acquire_total'),
    kvCommand('incr', `fogbound_metric_archive_acquire_${artifactId}`),
    kvCommand('incr', 'fogbound_metric_archive_email_submission_total'),
    kvCommand('incr', `fogbound_metric_archive_email_submission_${artifactId}`),
    kvCommand('sadd', 'fogbound_metric_archive_email_unique_total', normalized),
    kvCommand('sadd', `fogbound_metric_archive_email_unique_${artifactId}`, normalized),
    kvCommand('incr', periodMetricKey('archive_acquire_total')),
    kvCommand('incr', periodMetricKey(`archive_acquire_${artifactId}`)),
    kvCommand('incr', periodMetricKey('archive_email_submission_total')),
    kvCommand('incr', periodMetricKey(`archive_email_submission_${artifactId}`)),
    kvCommand('sadd', periodMetricKey('archive_email_unique_total'), normalized),
    kvCommand('sadd', periodMetricKey(`archive_email_unique_${artifactId}`), normalized),
  ]);
}

async function trackNotifySignup(email, artifactId) {
  if (!NOTIFY_ITEMS.has(artifactId)) return;
  const normalized = email.toLowerCase();
  await Promise.all([
    kvCommand('incr', 'fogbound_metric_notify_signup_total'),
    kvCommand('incr', `fogbound_metric_notify_signup_${artifactId}`),
    kvCommand('sadd', 'fogbound_metric_notify_email_unique_total', normalized),
    kvCommand('sadd', `fogbound_metric_notify_email_unique_${artifactId}`, normalized),
    kvCommand('incr', periodMetricKey('notify_signup_total')),
    kvCommand('incr', periodMetricKey(`notify_signup_${artifactId}`)),
    kvCommand('sadd', periodMetricKey('notify_email_unique_total'), normalized),
    kvCommand('sadd', periodMetricKey(`notify_email_unique_${artifactId}`), normalized),
  ]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = getBody(req);
    const email = String(body.email || '').trim();
    const artifactId = String(body.artifactId || '').trim().toLowerCase();
    if (artifactId === 'entry1') {
      return json(res, 403, { ok: false, error: 'This recovered account is available through checkout.' });
    }
    if (!isEmail(email)) {
      return json(res, 400, { ok: false, error: 'Enter a valid email address.' });
    }

    let stored = true;
    try {
      await storeEmail(email);
      await kvCommand('incr', EVENTS_TOTAL_KEY);
      await kvCommand('incr', 'fogbound_metric_event_email_submit');
      await kvCommand('incr', periodMetricKey('events_total'));
      await kvCommand('incr', periodMetricKey('event_email_submit'));
      if (artifactId === 'ben') {
        const visitorId = String(body.visitorId || '').trim().slice(0, 120);
        if (visitorId) {
          await kvCommand('sadd', 'fogbound_metric_funnel_ben_email', visitorId);
          await kvCommand('sadd', periodMetricKey('funnel_ben_email'), visitorId);
        }
      }
    } catch (err) {
      stored = false;
      console.error('Artifact email storage failed:', err);
    }
    if (NOTIFY_ITEMS.has(artifactId)) {
      try {
        await trackNotifySignup(email, artifactId);
      } catch (err) {
        console.error('Notify signup metrics failed:', err);
      }
      return json(res, 200, { ok: true, emailed: false, stored, notify: true });
    }
    const emailed = await sendArtifactEmail(email, getOrigin(req), artifactId);
    try {
      await trackArchiveAcquire(email, artifactId);
    } catch (err) {
      console.error('Archive acquire metrics failed:', err);
    }
    return json(res, 200, { ok: true, emailed, stored });
  } catch (err) {
    return json(res, 500, { ok: false, error: err?.message || 'Could not send artifacts.' });
  }
}

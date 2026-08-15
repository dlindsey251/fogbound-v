import { kvCommand } from './_kv.js';
import { METRIC_PERIOD_LABEL, METRIC_PERIOD_START, periodMetricKey } from './_metric-period.js';

const OWNER_PASSCODE = 'fogbound-owner';
const VISITORS_KEY = 'fogbound_metric_visitors';
const EMAILS_KEY = 'fogbound_artifact_emails';
const EVENTS_TOTAL_KEY = 'fogbound_metric_events_total';
const ARTIFACT_INTERACTIONS_KEY = 'fogbound_metric_artifact_interactions';
const JOURNEY_METRIC_START = '2026-08-10';
const JOURNEY_METRIC_LABEL = 'Since Aug 10';

const EVENT_BREAKDOWN = [
  ['site_visit', 'Site visits'],
  ['library_open', 'Library opened'],
  ['entrance_guided_impression', 'Guided entrance shown'],
  ['library_open_guided_v1', 'Guided entrance opened'],
  ['journal_open', 'Journal opened'],
  ['journal_spread_view', 'Journal spreads viewed'],
  ['what_lies_audio_preview_play', 'What Lies previews played'],
  ['what_lies_audio_recover_open', 'Full audio recovery opened'],
  ['what_lies_audio_acquire_start', 'Full audio acquisition started'],
  ['what_lies_audio_full_play', 'Recovered full audio played'],
  ['what_lies_audio_chapter_play', 'Recovered chapters selected'],
  ['what_lies_audio_download', 'Recovered full audio downloaded'],
  ['checkout_open', 'Checkout opened'],
  ['checkout_complete', 'Checkout completed'],
  ['artifact_reach', 'Artifact reached'],
  ['artifact_collect', 'Artifact collected'],
  ['artifact_take', 'Artifact taken'],
  ['email_form_shown', 'Email form shown'],
  ['email_field_focus', 'Email field focused'],
  ['email_submit_attempt', 'Email submit attempted'],
  ['email_submit', 'Email submitted'],
];

const ARTIFACT_BREAKDOWN = [
  ['ben_artifact_collect', 'Ben collected'],
  ['ben_artifact_take', 'Ben taken'],
  ['ibit_artifact_collect', 'Ibit collected'],
  ['ibit_artifact_take', 'Ibit taken'],
  ['entry1_artifact_take', 'Entry 1 taken'],
];

const ARTIFACT_EVENT_TYPES = new Set([
  'artifact_collect',
  'artifact_take',
  'artifact_view',
  'artifact_reach',
]);

const ARTIFACT_DETAIL_EVENT_TYPES = new Set([
  ...ARTIFACT_EVENT_TYPES,
  'email_form_shown',
  'email_field_focus',
  'email_submit_attempt',
]);

const FUNNEL_STEPS = [
  ['visit', 'Visitors', VISITORS_KEY],
  ['ben_reach', 'Reached Ben', 'fogbound_metric_funnel_ben_reach'],
  ['ben_collect', 'Opened Ben', 'fogbound_metric_funnel_ben_collect'],
  ['ben_take', 'Took Ben', 'fogbound_metric_funnel_ben_take'],
  ['ben_email_form', 'Email Form', 'fogbound_metric_funnel_ben_email_form'],
  ['ben_email_focus', 'Email Focused', 'fogbound_metric_funnel_ben_email_focus'],
  ['ben_email_attempt', 'Email Attempted', 'fogbound_metric_funnel_ben_email_attempt'],
  ['ben_email', 'Email Submitted', 'fogbound_metric_funnel_ben_email'],
];

const JOURNEY_FUNNEL_STEPS = [
  ['visit', 'Visited the site'],
  ['library_open', 'Opened the library'],
  ['journal_open', 'Opened the journal'],
  ['journal_entry0', 'Reached Entry 0'],
  ['journal_entry1', 'Reached Entry 1'],
  ['journal_entry2', 'Reached Entry 2'],
  ['journal_what_lies', 'Reached What Lies in the Fog'],
  ['what_lies_preview', 'Played the free preview'],
  ['what_lies_recover', 'Opened full audio recovery'],
  ['what_lies_acquire', 'Started full audio acquisition'],
  ['checkout_open', 'Opened What Lies checkout'],
  ['checkout_complete', 'Acquired the full audio'],
  ['what_lies_full_play', 'Played the full audio'],
  ['what_lies_download', 'Downloaded the full audio'],
];

const ARCHIVE_METRIC_ITEMS = [
  ['ben-story', "Entry 0: Ben's Story"],
  ['nested-dolls', 'Entry 1: Nested Dolls'],
  ['18-21', 'Recovered Entries: 18:21'],
  ['ibit', 'Guide to the Fog'],
  ['entry1', 'What Lies In The Fog'],
];

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

function isOwner(req) {
  return String(req.headers['x-owner-passcode'] || '') === OWNER_PASSCODE;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const body = getBody(req);
      const visitorId = String(body.visitorId || '').trim().slice(0, 120);
      if (!visitorId) return json(res, 400, { ok: false, error: 'Missing visitor id' });
      await kvCommand('sadd', VISITORS_KEY, visitorId);
      await kvCommand('sadd', periodMetricKey('visitors'), visitorId);
      const eventType = String(body.eventType || '').trim().slice(0, 80);
      if (eventType) {
        const commands = [
          kvCommand('incr', EVENTS_TOTAL_KEY),
          kvCommand('incr', `fogbound_metric_event_${eventType}`),
          kvCommand('incr', periodMetricKey('events_total')),
          kvCommand('incr', periodMetricKey(`event_${eventType}`)),
        ];
        let journeyStep = '';
        if (eventType === 'site_visit') journeyStep = 'visit';
        if (eventType === 'library_open') journeyStep = 'library_open';
        if (eventType === 'journal_open') journeyStep = 'journal_open';
        if (eventType === 'checkout_open' && body.artifactId === 'entry1') journeyStep = 'checkout_open';
        if (eventType === 'checkout_complete' && body.artifactId === 'entry1') journeyStep = 'checkout_complete';
        if (eventType === 'what_lies_audio_preview_play') journeyStep = 'what_lies_preview';
        if (eventType === 'what_lies_audio_recover_open') journeyStep = 'what_lies_recover';
        if (eventType === 'what_lies_audio_acquire_start') journeyStep = 'what_lies_acquire';
        if (eventType === 'what_lies_audio_full_play') journeyStep = 'what_lies_full_play';
        if (eventType === 'what_lies_audio_download') journeyStep = 'what_lies_download';
        if (eventType === 'journal_spread_view') {
          const spread = Number(body.spread);
          if (spread >= 1 && spread <= 3) journeyStep = `journal_entry${spread - 1}`;
          if (spread === 4) journeyStep = 'journal_what_lies';
        }
        if (journeyStep) {
          commands.push(
            kvCommand(
              'sadd',
              `fogbound_metric_journey_${JOURNEY_METRIC_START}_${journeyStep}`,
              visitorId,
            ),
          );
        }
        if (ARTIFACT_DETAIL_EVENT_TYPES.has(eventType)) {
          if (ARTIFACT_EVENT_TYPES.has(eventType)) {
            commands.push(kvCommand('incr', ARTIFACT_INTERACTIONS_KEY));
            commands.push(kvCommand('incr', periodMetricKey('artifact_interactions')));
          }
          const artifactId = String(body.artifactId || '').trim().slice(0, 60);
          if (artifactId) {
            commands.push(kvCommand('incr', `fogbound_metric_artifact_${artifactId}_${eventType}`));
            commands.push(kvCommand('incr', periodMetricKey(`artifact_${artifactId}_${eventType}`)));
            if (artifactId === 'ben') {
              if (eventType === 'artifact_reach') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_reach', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_reach'), visitorId));
              } else if (eventType === 'artifact_collect') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_collect', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_collect'), visitorId));
              } else if (eventType === 'artifact_take') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_take', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_take'), visitorId));
              } else if (eventType === 'email_form_shown') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_email_form', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_email_form'), visitorId));
              } else if (eventType === 'email_field_focus') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_email_focus', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_email_focus'), visitorId));
              } else if (eventType === 'email_submit_attempt') {
                commands.push(kvCommand('sadd', 'fogbound_metric_funnel_ben_email_attempt', visitorId));
                commands.push(kvCommand('sadd', periodMetricKey('funnel_ben_email_attempt'), visitorId));
              }
            }
          }
        }
        await Promise.all(commands);
      }
      return json(res, 200, { ok: true });
    } catch (err) {
      return json(res, 200, {
        ok: false,
        storageAvailable: false,
        error: err?.message || 'Metrics unavailable',
      });
    }
  }

  if (req.method === 'GET') {
    if (!isOwner(req)) return json(res, 403, { ok: false, error: 'Owner tools locked' });
    try {
      const [
        visitors,
        rawEmails,
        eventsTotal,
        artifactInteractions,
        ...breakdownValues
      ] = await Promise.all([
        kvCommand('scard', VISITORS_KEY),
        kvCommand('get', EMAILS_KEY),
        kvCommand('get', EVENTS_TOTAL_KEY),
        kvCommand('get', ARTIFACT_INTERACTIONS_KEY),
        ...EVENT_BREAKDOWN.map(([key]) => kvCommand('get', `fogbound_metric_event_${key}`)),
        ...ARTIFACT_BREAKDOWN.map(([key]) => kvCommand('get', `fogbound_metric_artifact_${key}`)),
        ...FUNNEL_STEPS.map(([, , key]) => kvCommand('scard', key)),
      ]);
      const eventValues = breakdownValues.slice(0, EVENT_BREAKDOWN.length);
      const artifactValues = breakdownValues.slice(EVENT_BREAKDOWN.length, EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length);
      const funnelValues = breakdownValues.slice(EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length);
      let emails = [];
      if (rawEmails) {
        try {
          emails = JSON.parse(rawEmails);
        } catch (_err) {
          emails = [];
        }
      }
      const [
        archiveAcquireTotal,
        archiveEmailSubmissionTotal,
        archiveEmailUniqueTotal,
        archivePurchaseTotal,
        soundtrackPurchaseTotal,
        notifySignupTotal,
        notifyUniqueTotal,
        ...archiveMetricValues
      ] = await Promise.all([
        kvCommand('get', 'fogbound_metric_archive_acquire_total'),
        kvCommand('get', 'fogbound_metric_archive_email_submission_total'),
        kvCommand('scard', 'fogbound_metric_archive_email_unique_total'),
        kvCommand('get', 'fogbound_metric_archive_purchase_total'),
        kvCommand('get', 'fogbound_metric_soundtrack_purchase_total'),
        kvCommand('get', 'fogbound_metric_notify_signup_18-21-notify'),
        kvCommand('scard', 'fogbound_metric_notify_email_unique_18-21-notify'),
        ...ARCHIVE_METRIC_ITEMS.flatMap(([id]) => [
          kvCommand('get', `fogbound_metric_archive_acquire_${id}`),
          kvCommand('get', `fogbound_metric_archive_email_submission_${id}`),
          kvCommand('scard', `fogbound_metric_archive_email_unique_${id}`),
          kvCommand('get', `fogbound_metric_archive_purchase_${id}`),
        ]),
      ]);
      const archiveItems = ARCHIVE_METRIC_ITEMS.map(([id, label], index) => {
        const offset = index * 4;
        return {
          id,
          label,
          acquires: Number(archiveMetricValues[offset] || 0),
          emailSubmissions: Number(archiveMetricValues[offset + 1] || 0),
          uniqueEmails: Number(archiveMetricValues[offset + 2] || 0),
          purchases: Number(archiveMetricValues[offset + 3] || 0),
        };
      });
      const [
        periodVisitors,
        periodEmailSubmissions,
        periodUniqueEmails,
        periodEventsTotal,
        periodArtifactInteractions,
        periodArchiveAcquireTotal,
        periodArchiveEmailSubmissionTotal,
        periodArchiveEmailUniqueTotal,
        periodArchivePurchaseTotal,
        periodSoundtrackPurchaseTotal,
        periodNotifySignupTotal,
        periodNotifyUniqueTotal,
        ...periodBreakdownValues
      ] = await Promise.all([
        kvCommand('scard', periodMetricKey('visitors')),
        kvCommand('get', periodMetricKey('email_submission_total')),
        kvCommand('scard', periodMetricKey('email_unique_total')),
        kvCommand('get', periodMetricKey('events_total')),
        kvCommand('get', periodMetricKey('artifact_interactions')),
        kvCommand('get', periodMetricKey('archive_acquire_total')),
        kvCommand('get', periodMetricKey('archive_email_submission_total')),
        kvCommand('scard', periodMetricKey('archive_email_unique_total')),
        kvCommand('get', periodMetricKey('archive_purchase_total')),
        kvCommand('get', periodMetricKey('soundtrack_purchase_total')),
        kvCommand('get', periodMetricKey('notify_signup_18-21-notify')),
        kvCommand('scard', periodMetricKey('notify_email_unique_18-21-notify')),
        ...EVENT_BREAKDOWN.map(([key]) => kvCommand('get', periodMetricKey(`event_${key}`))),
        ...ARTIFACT_BREAKDOWN.map(([key]) => kvCommand('get', periodMetricKey(`artifact_${key}`))),
        ...FUNNEL_STEPS.map(([, , key]) => {
          const suffix = key.replace(/^fogbound_metric_/, '');
          return kvCommand('scard', periodMetricKey(suffix));
        }),
        ...ARCHIVE_METRIC_ITEMS.flatMap(([id]) => [
          kvCommand('get', periodMetricKey(`archive_acquire_${id}`)),
          kvCommand('get', periodMetricKey(`archive_email_submission_${id}`)),
          kvCommand('scard', periodMetricKey(`archive_email_unique_${id}`)),
          kvCommand('get', periodMetricKey(`archive_purchase_${id}`)),
        ]),
      ]);
      const periodEventValues = periodBreakdownValues.slice(0, EVENT_BREAKDOWN.length);
      const periodArtifactValues = periodBreakdownValues.slice(EVENT_BREAKDOWN.length, EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length);
      const periodFunnelValues = periodBreakdownValues.slice(EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length, EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length + FUNNEL_STEPS.length);
      const periodArchiveMetricValues = periodBreakdownValues.slice(EVENT_BREAKDOWN.length + ARTIFACT_BREAKDOWN.length + FUNNEL_STEPS.length);
      const periodArchiveItems = ARCHIVE_METRIC_ITEMS.map(([id, label], index) => {
        const offset = index * 4;
        return {
          id,
          label,
          acquires: Number(periodArchiveMetricValues[offset] || 0),
          emailSubmissions: Number(periodArchiveMetricValues[offset + 1] || 0),
          uniqueEmails: Number(periodArchiveMetricValues[offset + 2] || 0),
          purchases: Number(periodArchiveMetricValues[offset + 3] || 0),
        };
      });
      const journeyValues = await Promise.all(
        JOURNEY_FUNNEL_STEPS.map(([key]) => (
          kvCommand('scard', `fogbound_metric_journey_${JOURNEY_METRIC_START}_${key}`)
        )),
      );
      return json(res, 200, {
        ok: true,
        visitors: Number(visitors || 0),
        emailSubmissions: emails.length,
        uniqueEmails: emails
          .map((entry) => String(entry?.email || '').trim().toLowerCase())
          .filter(Boolean),
        eventsTotal: Number(eventsTotal || 0),
        artifactInteractions: Number(artifactInteractions || 0),
        eventBreakdown: EVENT_BREAKDOWN.map(([_key, label], index) => ({
          label,
          count: Number(eventValues[index] || 0),
        })),
        artifactBreakdown: ARTIFACT_BREAKDOWN.map(([_key, label], index) => ({
          label,
          count: Number(artifactValues[index] || 0),
        })),
        benFunnel: FUNNEL_STEPS.map(([key, label], index) => ({
          key,
          label,
          count: Number(funnelValues[index] || 0),
        })),
        journeyFunnel: JOURNEY_FUNNEL_STEPS.map(([key, label], index) => ({
          key,
          label,
          count: Number(journeyValues[index] || 0),
        })),
        journeyStart: JOURNEY_METRIC_START,
        journeyLabel: JOURNEY_METRIC_LABEL,
        archiveMetrics: {
          totalAcquires: Number(archiveAcquireTotal || 0),
          totalEmailSubmissions: Number(archiveEmailSubmissionTotal || 0),
          totalUniqueEmails: Number(archiveEmailUniqueTotal || 0),
          totalPurchases: Number(archivePurchaseTotal || 0),
          soundtrackPurchases: Number(soundtrackPurchaseTotal || 0),
          notify1821: Number(notifySignupTotal || 0),
          notify1821UniqueEmails: Number(notifyUniqueTotal || 0),
          items: archiveItems,
        },
        currentPeriod: {
          start: METRIC_PERIOD_START,
          label: METRIC_PERIOD_LABEL,
          visitors: Number(periodVisitors || 0),
          emailSubmissions: Number(periodEmailSubmissions || 0),
          uniqueEmails: Number(periodUniqueEmails || 0),
          eventsTotal: Number(periodEventsTotal || 0),
          artifactInteractions: Number(periodArtifactInteractions || 0),
          eventBreakdown: EVENT_BREAKDOWN.map(([_key, label], index) => ({
            label,
            count: Number(periodEventValues[index] || 0),
          })),
          artifactBreakdown: ARTIFACT_BREAKDOWN.map(([_key, label], index) => ({
            label,
            count: Number(periodArtifactValues[index] || 0),
          })),
          benFunnel: FUNNEL_STEPS.map(([key, label], index) => ({
            key,
            label,
            count: Number(periodFunnelValues[index] || 0),
          })),
          archiveMetrics: {
            totalAcquires: Number(periodArchiveAcquireTotal || 0),
            totalEmailSubmissions: Number(periodArchiveEmailSubmissionTotal || 0),
            totalUniqueEmails: Number(periodArchiveEmailUniqueTotal || 0),
            totalPurchases: Number(periodArchivePurchaseTotal || 0),
            soundtrackPurchases: Number(periodSoundtrackPurchaseTotal || 0),
            notify1821: Number(periodNotifySignupTotal || 0),
            notify1821UniqueEmails: Number(periodNotifyUniqueTotal || 0),
            items: periodArchiveItems,
          },
        },
        storageAvailable: true,
      });
    } catch (err) {
      return json(res, 200, {
        ok: false,
        visitors: null,
        emailSubmissions: null,
        uniqueEmails: [],
        eventsTotal: null,
        artifactInteractions: null,
        eventBreakdown: [],
        artifactBreakdown: [],
        journeyFunnel: [],
        archiveMetrics: {
          totalAcquires: 0,
          totalEmailSubmissions: 0,
          totalUniqueEmails: 0,
          totalPurchases: 0,
          soundtrackPurchases: 0,
          notify1821: 0,
          notify1821UniqueEmails: 0,
          items: [],
        },
        storageAvailable: false,
        error: err?.message || 'Metrics unavailable',
      });
    }
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}

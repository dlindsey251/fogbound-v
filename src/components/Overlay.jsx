import { useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { getVisitorId, isMetricsOptedOut, trackMetric } from '../utils/metrics';
import useKeyboardInset from '../hooks/useKeyboardInset';
import EmbeddedCheckoutPanel from './EmbeddedCheckoutPanel';

const LS_IBIT_FULL = 'fogbound_ibit_full';
const LS_BG_AFTER = 'fogbound_bg_after';
const LS_ARTIFACT_EMAIL_PROMPT_SUPPRESSED = 'fogbound_artifact_email_prompt_suppressed';
const BEN_STORY_DOWNLOAD = '/Fogbound%20V%20Entry%20Stories.pdf';
const BEN_STORY_FILENAME = 'Fogbound V Entry Stories.pdf';
const BEN_STORY_PREVIEW = '/Bens%20Image.png';

function isMobileInAppBrowser() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return false;

  const knownInApp = /Instagram|FBAN|FBAV|FB_IAB|FBAN\/FBIOS|FBIOS|FB_IAB\/FB4A|Messenger|Line\/|TikTok|Bytedance|Twitter|X\/|LinkedInApp|Pinterest|Snapchat|Reddit|Discord|WhatsApp|Telegram|MicroMessenger|WeChat|GSA|GoogleApp|DuckDuckGo|YaApp|KAKAOTALK|KAKAOSTORY/i.test(ua);
  const androidWebView = /; wv\)|\bwv\b|Version\/[\d.]+ Chrome\/[\d.]+ Mobile Safari/i.test(ua);
  const iosWebView = /iPhone|iPad|iPod/i.test(ua)
    && /AppleWebKit/i.test(ua)
    && !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return knownInApp || androidWebView || iosWebView;
}

const CONTENT = {
  entry1: {
    title: 'What Lies In The Fog',
    body: 'Five strangers enter an eerie fog. Decide what the recovered account is worth to you.',
    previewUrl: '/lies.png',
    previewType: 'image',
    payWhatYouWant: true,
  },
};

/**
 * Overlay — modal panel that appears when an artifact is collected.
 * Clicking the backdrop or the Close button dismisses it.
 */
export default function Overlay() {
  const activeOverlay = useGameStore((s) => s.activeOverlay);
  const dismissOverlay = useGameStore((s) => s.dismissOverlay);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [takenEmail, setTakenEmail] = useState('');
  const [pendingExitDownload, setPendingExitDownload] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [contribution, setContribution] = useState('4.99');
  const [checkoutPanel, setCheckoutPanel] = useState(null);
  const ibitFullUnlocked = localStorage.getItem(LS_IBIT_FULL) === '1';
  const afterEntryOne = localStorage.getItem(LS_BG_AFTER) === '1';
  useKeyboardInset(emailVisible, '--overlay-keyboard-inset');
  const benItem = afterEntryOne
    ? {
        title: "Ben's Story",
        body: 'He was only a boy...',
        previewUrl: BEN_STORY_PREVIEW,
        previewType: 'image',
        takeDownload: BEN_STORY_DOWNLOAD,
        takeFilename: BEN_STORY_FILENAME,
      }
    : {
        title: "Ben's Story",
        body: 'He was only a boy...',
        previewUrl: BEN_STORY_PREVIEW,
        previewType: 'image',
        takeDownload: BEN_STORY_DOWNLOAD,
        takeFilename: BEN_STORY_FILENAME,
      };
  const item = activeOverlay === 'ibit'
    ? (
        ibitFullUnlocked
          ? {
              title: 'Guide to the fog: Full',
              body: 'You found another artifact. Ibit shaw... who was he?',
              previewUrl: '/Guide%20To%20The%20Fog.pdf',
              previewType: 'pdf',
              takeDownload: '/Guide%20To%20The%20Fog.pdf',
              takeFilename: 'Guide To The Fog.pdf',
            }
          : {
              title: 'Guide to the fog: fragment',
              body: "Part of a mad man's notes.",
              link: null,
              previewUrl: '/fragment.png',
              previewType: 'image',
            }
      )
    : activeOverlay === 'ben'
      ? benItem
    : CONTENT[activeOverlay];

  useEffect(() => {
    setEmailVisible(false);
    setEmailStatus('idle');
    setEmailMessage('');
    setTakenEmail('');
    setPendingExitDownload(false);
    setEmailFocused(false);
    setExitConfirmVisible(false);
    setContribution('4.99');
    setCheckoutPanel(null);
  }, [activeOverlay]);

  if (!item) return null;

  const emailPromptCopy = activeOverlay === 'ben'
    ? "Enter your email to receive Ben's Story and the recovered audio."
    : activeOverlay === 'ibit'
      ? "Enter your email to receive Ibit Shaw's artifact."
      : 'Enter your email to receive the artifact.';
  const emailSubmitLabel = activeOverlay === 'ben' ? 'Send Stories' : 'Send Artifact';

  const dismiss = () => dismissOverlay();
  const allowTake = !!item.takeDownload;
  const contributionValid = Number(contribution) >= 1 && Number(contribution) <= 100;

  const beginEntryOneCheckout = async () => {
    if (!contributionValid) return;
    setCheckoutPanel({ itemName: item.title, clientSecret: '', error: '' });
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          artifactId: 'entry1',
          amountCents: Math.round(Number(contribution) * 100),
          visitorId: isMetricsOptedOut() ? '' : getVisitorId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.clientSecret) {
        throw new Error(data?.error || 'Could not open checkout.');
      }
      setCheckoutPanel({ itemName: item.title, clientSecret: data.clientSecret, error: '' });
      trackMetric('checkout_open', { artifactId: 'entry1' });
    } catch (err) {
      setCheckoutPanel({
        itemName: item.title,
        clientSecret: '',
        error: err?.message || 'Could not open checkout.',
      });
    }
  };
  const downloadArtifact = ({ force = false } = {}) => {
    if (!force && isMobileInAppBrowser()) return false;
    const a = document.createElement('a');
    a.href = item.takeDownload;
    if (item.takeFilename) a.download = item.takeFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  };

  const handleTake = () => {
    if (!allowTake) {
      dismiss();
      window.dispatchEvent(new CustomEvent('fogbound-menu-or-view-exit'));
      return;
    }
    const downloaded = downloadArtifact();
    trackMetric('artifact_take', { artifactId: activeOverlay || 'unknown' });
    if (localStorage.getItem(LS_ARTIFACT_EMAIL_PROMPT_SUPPRESSED) === '1') {
      dismiss();
      window.dispatchEvent(new CustomEvent('fogbound-menu-or-view-exit'));
      return;
    }
    setPendingExitDownload(!downloaded && activeOverlay === 'ben');
    setEmailVisible(true);
    setEmailStatus('idle');
    setEmailMessage('');
    trackMetric('email_form_shown', { artifactId: activeOverlay || 'unknown' });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    trackMetric('email_submit_attempt', { artifactId: activeOverlay || 'unknown' });
    setEmailStatus('submitting');
    setEmailMessage('');
    setTakenEmail('');
    try {
      const res = await fetch('/api/artifact-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          artifactId: activeOverlay || 'unknown',
          visitorId: isMetricsOptedOut() ? '' : getVisitorId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not send artifacts.');
      }
      setTakenEmail(trimmedEmail);
      setPendingExitDownload(false);
      localStorage.setItem(LS_ARTIFACT_EMAIL_PROMPT_SUPPRESSED, '1');
      setEmailStatus('sent');
      setEmailMessage(
        data.emailed
          ? 'The artifacts were sent.'
          : 'Your email was saved. Email delivery is not configured yet.'
      );
    } catch (err) {
      setEmailStatus('error');
      setEmailMessage(err?.message || 'Could not send artifacts.');
    }
  };

  const handleExit = () => {
    if (activeOverlay === 'ben' && emailVisible && emailStatus !== 'sent') {
      document.activeElement?.blur?.();
      setExitConfirmVisible(true);
      return;
    }
    leaveOverlay();
  };

  const leaveOverlay = () => {
    if (pendingExitDownload && activeOverlay === 'ben' && emailStatus !== 'sent') {
      downloadArtifact({ force: true });
    }
    dismiss();
    window.dispatchEvent(new CustomEvent('fogbound-menu-or-view-exit'));
  };

  return (
    <div
      className="overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={handleExit}
    >
      <div
        className={`overlay-panel ${activeOverlay === 'ben' ? 'overlay-panel--ben' : 'overlay-panel--persistent-exit'} ${emailVisible ? 'overlay-panel--email-active' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="overlay-exit" onClick={handleExit} aria-label="Exit overlay">
          Exit
        </button>
        <h2>{item.title}</h2>
        <p>{item.body}</p>

        {item.previewUrl && (
          <div className="overlay-preview-wrap">
            {item.previewType === 'image' ? (
              <img
                className="overlay-preview-image"
                src={item.previewUrl}
                alt={`${item.title} preview`}
              />
            ) : (
              <iframe
                className="overlay-preview-frame"
                src={item.previewUrl}
                title={`${item.title} preview`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        )}

        {allowTake && !emailVisible && <button onClick={handleTake}>Take</button>}

        {item.payWhatYouWant && (
          <div className="overlay-contribution">
            <label htmlFor="overlay-contribution">Choose your contribution</label>
            <div className="overlay-contribution__amount">
              <span aria-hidden="true">$</span>
              <input
                id="overlay-contribution"
                type="number"
                inputMode="decimal"
                min="1"
                max="100"
                step="0.01"
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
              />
            </div>
            <small>$1 minimum · suggested $4.99</small>
            <button type="button" onClick={beginEntryOneCheckout} disabled={!contributionValid}>
              Continue to checkout
            </button>
          </div>
        )}

        {emailVisible && (
          <form className="artifact-email-form" onSubmit={handleEmailSubmit}>
            <p className="artifact-email-copy">
              {emailPromptCopy}
            </p>
            <label htmlFor="artifact-email">Email address</label>
            <div className="artifact-email-row">
              <input
                id="artifact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailStatus !== 'submitting') {
                    setEmailStatus('idle');
                    setEmailMessage('');
                    setTakenEmail('');
                  }
                }}
                onFocus={(e) => {
                  if (emailFocused) return;
                  setEmailFocused(true);
                  trackMetric('email_field_focus', { artifactId: activeOverlay || 'unknown' });
                  window.setTimeout(() => {
                    e.currentTarget?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
                  }, 120);
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={emailStatus === 'submitting' || emailStatus === 'sent'}
              />
              <button type="submit" disabled={emailStatus === 'submitting'}>
                {emailStatus === 'submitting' ? 'Sending' : emailSubmitLabel}
              </button>
            </div>
            <p className="artifact-email-reassurance">
              No spam. Just the artifacts you found.
            </p>
            {takenEmail && (
              <div className="artifact-email-taken" aria-hidden="true">
                <span>{takenEmail}</span>
              </div>
            )}
            {emailMessage && (
              <p className={`artifact-email-status is-${emailStatus}`}>
                {emailMessage}
              </p>
            )}
          </form>
        )}

        {exitConfirmVisible && (
          <div className="artifact-exit-confirm" role="alertdialog" aria-modal="false" aria-label="Leave without receiving artifacts">
            <p>Leave without receiving the other artifacts?</p>
            <div className="artifact-exit-confirm-actions">
              <button type="button" onClick={() => setExitConfirmVisible(false)}>
                Enter Email
              </button>
              <button type="button" onClick={leaveOverlay}>
                Leave
              </button>
            </div>
          </div>
        )}
      </div>
      {checkoutPanel && (
        <EmbeddedCheckoutPanel
          itemName={checkoutPanel.itemName}
          clientSecret={checkoutPanel.clientSecret}
          error={checkoutPanel.error}
          onClose={() => setCheckoutPanel(null)}
        />
      )}
    </div>
  );
}

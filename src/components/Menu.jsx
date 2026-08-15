import { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { clearProgressStorage, LS_GLOBAL_RESET_APPLIED, LS_GLOBAL_RESET_EPOCH } from '../utils/resetProgress';
import { isMetricsOptedOut, setMetricsOptOut } from '../utils/metrics';

const OWNER_PASSCODE = 'fogbound-owner';
const SUPER_OWNER_PASSCODE = 'dermyrius lindsey';
const LS_MENU_UNLOCKED_SESSION = 'fogbound-menu-unlocked-session';
const LS_IBIT_FULL = 'fogbound_ibit_full';
const LS_IBIT_MENU_REVEAL = 'fogbound_ibit_menu_reveal';
const LS_MENU_LOCK_AFTER_ENTRY1 = 'fogbound_menu_locked_after_entry1';
const LS_ARTIFACT_EMAIL_PROMPT_SUPPRESSED = 'fogbound_artifact_email_prompt_suppressed';
const LS_LOOP_COUNT = 'fogbound_loop_count';
const IBIT_TITLE_FRAGMENT = 'Guide to the fog: fragment';
const IBIT_TITLE_FULL = 'Guide to the fog: Full';
const IBIT_DESC_FRAGMENT = "Part of a mad man's notes.";
const IBIT_DESC_FULL = 'A mad man or something more...';

/**
 * Menu — top-right button that opens a panel showing:
 *   - Collected fragments (locked until earned)
 *   - Settings toggles (Whispers, Low Power)
 *
 * Fragment unlock state is persisted via Zustand's localStorage middleware.
 */
export default function Menu() {
  const hasCompletedFirstLoop = () => {
    const loopRaw = Number(localStorage.getItem(LS_LOOP_COUNT) || 0);
    return Number.isFinite(loopRaw) && loopRaw >= 1;
  };
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(
    () =>
      localStorage.getItem(LS_MENU_LOCK_AFTER_ENTRY1) !== '1'
      && hasCompletedFirstLoop()
  );
  const [artifactInteractedThisVisit, setArtifactInteractedThisVisit] = useState(false);
  const [menuLockedAfterEntry1, setMenuLockedAfterEntry1] = useState(
    () => localStorage.getItem(LS_MENU_LOCK_AFTER_ENTRY1) === '1'
  );
  const [ibitFullUnlocked, setIbitFullUnlocked] = useState(
    () => localStorage.getItem(LS_IBIT_FULL) === '1'
  );
  const [ibitTitle, setIbitTitle] = useState(
    () => (localStorage.getItem(LS_IBIT_FULL) === '1' ? IBIT_TITLE_FULL : IBIT_TITLE_FRAGMENT)
  );
  const [ibitDesc, setIbitDesc] = useState(
    () => (localStorage.getItem(LS_IBIT_FULL) === '1' ? IBIT_DESC_FULL : IBIT_DESC_FRAGMENT)
  );
  const [entry1Unlocked, setEntry1Unlocked] = useState(
    () => localStorage.getItem('fogbound_entry1_picked') === '1'
  );
  const [externalAttentionTarget, setExternalAttentionTarget] = useState(null);
  const [ownerUnlocked, setOwnerUnlocked] = useState(
    () => sessionStorage.getItem('fogbound-owner-unlocked') === '1'
  );
  const [superOwnerUnlocked, setSuperOwnerUnlocked] = useState(
    () => sessionStorage.getItem('fogbound-super-owner-unlocked') === '1'
  );
  const [ownerMetrics, setOwnerMetrics] = useState(null);
  const [ownerMetricsStatus, setOwnerMetricsStatus] = useState('idle');
  const [metricsOptedOut, setMetricsOptedOutState] = useState(() => isMetricsOptedOut());

  const fragments    = useGameStore((s) => s.fragments);
  const loopCount    = useGameStore((s) => s.loopCount);
  const menuAttentionTarget = useGameStore((s) => s.menuAttentionTarget);
  const clearMenuAttention = useGameStore((s) => s.clearMenuAttention);
  const whispersOn   = useGameStore((s) => s.whispersOn);
  const lowPower     = useGameStore((s) => s.lowPower);
  const joystickEnabled = useGameStore((s) => s.joystickEnabled);
  const toggleWhispers  = useGameStore((s) => s.toggleWhispers);
  const toggleLowPower  = useGameStore((s) => s.toggleLowPower);
  const toggleJoystick  = useGameStore((s) => s.toggleJoystick);
  const resetForTesting = useGameStore((s) => s.resetForTesting);
  const setActiveOverlay = useGameStore((s) => s.setActiveOverlay);
  const [menuHighlightTarget, setMenuHighlightTarget] = useState(null);
  const effectiveAttentionTarget = menuAttentionTarget || externalAttentionTarget;
  const menuRevealTriggeredRef = useRef(localStorage.getItem(LS_IBIT_MENU_REVEAL) === '1');
  const animTimersRef = useRef([]);
  const menuUnlockTimerRef = useRef(null);

  const clearAnimTimers = () => {
    animTimersRef.current.forEach((id) => clearInterval(id));
    animTimersRef.current = [];
  };

  const animateTextMorph = (from, to, setter, stepMs = 180) => {
    if (from === to) {
      setter(to);
      return;
    }
    const steps = Math.max(from.length, to.length) + 2;
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      const reveal = Math.min(to.length, Math.floor((frame / steps) * to.length));
      const holdTail = Math.max(0, Math.min(from.length, from.length - reveal));
      const next = `${to.slice(0, reveal)}${from.slice(from.length - holdTail)}`;
      setter(next);
      if (frame >= steps) {
        clearInterval(id);
        setter(to);
      }
    }, stepMs);
    animTimersRef.current.push(id);
  };

  useEffect(() => {
    const onAttention = (e) => {
      const target = e?.detail?.target;
      if (!target) return;
      if (target === 'entry1') setEntry1Unlocked(true);
      setExternalAttentionTarget(target);
    };
    window.addEventListener('fogbound-menu-attention', onAttention);
    return () => window.removeEventListener('fogbound-menu-attention', onAttention);
  }, []);

  useEffect(() => {
    const onArtifactCollected = () => setArtifactInteractedThisVisit(true);
    window.addEventListener('fogbound-artifact-collected', onArtifactCollected);
    return () => window.removeEventListener('fogbound-artifact-collected', onArtifactCollected);
  }, []);

  useEffect(() => {
    const onEntry1Picked = () => {
      setMenuLockedAfterEntry1(true);
      setMenuVisible(false);
      setOpen(false);
    };
    window.addEventListener('fogbound-entry1-picked', onEntry1Picked);
    return () => window.removeEventListener('fogbound-entry1-picked', onEntry1Picked);
  }, []);

  useEffect(() => {
    if (menuLockedAfterEntry1) return;
    const loopReady = Math.max(loopCount || 0, Number(localStorage.getItem(LS_LOOP_COUNT) || 0)) >= 1;
    if (!loopReady) {
      setMenuVisible(false);
      if (menuUnlockTimerRef.current) {
        clearTimeout(menuUnlockTimerRef.current);
        menuUnlockTimerRef.current = null;
      }
      return;
    }

    if (artifactInteractedThisVisit || !menuVisible) {
      setMenuVisible(true);
      sessionStorage.setItem(LS_MENU_UNLOCKED_SESSION, '1');
      if (menuUnlockTimerRef.current) {
        clearTimeout(menuUnlockTimerRef.current);
        menuUnlockTimerRef.current = null;
      }
      return;
    }

    return () => {
      if (menuUnlockTimerRef.current) {
        clearTimeout(menuUnlockTimerRef.current);
        menuUnlockTimerRef.current = null;
      }
    };
  }, [artifactInteractedThisVisit, menuVisible, menuLockedAfterEntry1, loopCount]);

  useEffect(() => {
    if (!ibitFullUnlocked) return;
    setIbitTitle(IBIT_TITLE_FULL);
    setIbitDesc(IBIT_DESC_FULL);
  }, [ibitFullUnlocked]);

  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      if (menuRevealTriggeredRef.current) return;
      if (localStorage.getItem('fogbound_bg_after') !== '1') return;
      if (!s.fragments?.ibit) return;
      if (s.currentNorm < 0.5) return;

      menuRevealTriggeredRef.current = true;
      localStorage.setItem(LS_IBIT_MENU_REVEAL, '1');
      localStorage.removeItem(LS_MENU_LOCK_AFTER_ENTRY1);
      localStorage.removeItem(LS_ARTIFACT_EMAIL_PROMPT_SUPPRESSED);
      window.dispatchEvent(new CustomEvent('fogbound-artifact-email-prompt-reset'));
      setMenuLockedAfterEntry1(false);
      setMenuVisible(true);

      setMenuHighlightTarget('ibit');
      clearMenuAttention();
      setExternalAttentionTarget(null);
      setOpen(true);

      if (!ibitFullUnlocked) {
        clearAnimTimers();
        animateTextMorph(IBIT_TITLE_FRAGMENT, IBIT_TITLE_FULL, setIbitTitle, 180);
        animateTextMorph(IBIT_DESC_FRAGMENT, IBIT_DESC_FULL, setIbitDesc, 210);
        const persistId = setTimeout(() => {
          setIbitFullUnlocked(true);
          localStorage.setItem(LS_IBIT_FULL, '1');
        }, 7800);
        animTimersRef.current.push(persistId);
      }
    });

    return () => {
      unsub();
      clearAnimTimers();
    };
  }, [clearMenuAttention, ibitFullUnlocked]);

  const handleOpenMenu = () => {
    if (effectiveAttentionTarget) {
      setMenuHighlightTarget(effectiveAttentionTarget);
      clearMenuAttention();
      setExternalAttentionTarget(null);
    }
    setOpen(true);
  };

  const handleCloseMenu = () => {
    setOpen(false);
    setMenuHighlightTarget(null);
    window.dispatchEvent(new CustomEvent('fogbound-menu-or-view-exit'));
  };

  const handleViewEntryOne = () => {
    setOpen(false);
    setMenuHighlightTarget(null);
    setActiveOverlay('entry1', 'menu');
  };

  const handleViewBen = () => {
    setOpen(false);
    setMenuHighlightTarget(null);
    setActiveOverlay('ben', 'menu');
  };

  const handleViewIbit = () => {
    setOpen(false);
    setMenuHighlightTarget(null);
    setActiveOverlay('ibit', 'menu');
  };

  const handleOwnerUnlock = () => {
    const input = window.prompt('Owner passcode');
    if (input === OWNER_PASSCODE) {
      sessionStorage.setItem('fogbound-owner-unlocked', '1');
      setOwnerUnlocked(true);
    }
  };

  const fetchOwnerMetrics = async () => {
    setOwnerMetricsStatus('loading');
    try {
      const res = await fetch('/api/metrics', {
        headers: { 'x-owner-passcode': OWNER_PASSCODE },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Metrics unavailable');
      }
      setOwnerMetrics(data);
      setOwnerMetricsStatus('ready');
    } catch (err) {
      setOwnerMetrics({
        visitors: null,
        emailSubmissions: null,
        error: err?.message || 'Metrics unavailable',
      });
      setOwnerMetricsStatus('error');
    }
  };

  useEffect(() => {
    if (!open || !ownerUnlocked) return;
    fetchOwnerMetrics();
  }, [open, ownerUnlocked]);

  const handleResetTestingState = () => {
    resetForTesting();
    clearProgressStorage({ preserveGlobalResetMeta: true });

    window.scrollTo({ top: 0, behavior: 'auto' });
    window.location.reload();
  };

  const handleToggleMetricsOptOut = () => {
    const next = !metricsOptedOut;
    setMetricsOptOut(next);
    setMetricsOptedOutState(next);
  };

  const handleSuperOwnerUnlock = () => {
    const input = window.prompt('Global reset passcode');
    if ((input || '').trim().toLowerCase() === SUPER_OWNER_PASSCODE) {
      sessionStorage.setItem('fogbound-super-owner-unlocked', '1');
      setSuperOwnerUnlocked(true);
    }
  };

  const handleGlobalReset = () => {
    (async () => {
      const ok = window.confirm('Reset site progress for all users?');
      if (!ok) return;

      const pass = window.prompt('Confirm global reset passcode');
      if (!pass) return;

      try {
        const res = await fetch('/api/global-reset', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ passcode: pass }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.epoch) {
          window.alert(data?.error || 'Global reset failed.');
          return;
        }

        localStorage.setItem(LS_GLOBAL_RESET_EPOCH, String(data.epoch));
        localStorage.setItem(LS_GLOBAL_RESET_APPLIED, String(data.epoch));
        resetForTesting();
        clearProgressStorage({ preserveGlobalResetMeta: true });
        window.scrollTo({ top: 0, behavior: 'auto' });
        window.location.reload();
      } catch (_err) {
        window.alert('Global reset failed.');
      }
    })();
  };

  const stopOwnerMenuScrollCapture = (e) => {
    if (!ownerUnlocked) return;
    e.stopPropagation();
  };

  return (
    <>
      {menuVisible && (
        <button
          id="menu-btn"
          className={effectiveAttentionTarget ? 'menu-attention-red' : ''}
          onClick={handleOpenMenu}
          aria-label="Open menu"
        >
          Menu
        </button>
      )}

      {menuVisible && open && (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          onClick={handleCloseMenu}
        >
          <div
            className={`menu-panel ${ownerUnlocked ? 'menu-panel--owner-scroll' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onWheel={stopOwnerMenuScrollCapture}
            onTouchMove={stopOwnerMenuScrollCapture}
            onKeyDown={stopOwnerMenuScrollCapture}
            tabIndex={ownerUnlocked ? -1 : undefined}
          >
            <button
              className="menu-close"
              onClick={handleCloseMenu}
              aria-label="Close menu"
            >
              ×
            </button>

            {loopCount > 0 && (
              <p className="menu-loops">
                Times through: <span>{loopCount}</span>
              </p>
            )}

            <h2>Fragments</h2>
            <div className="fragment-list">
              {fragments.ibit ? (
                <div className={`fragment-item unlocked ${menuHighlightTarget === 'ibit' ? 'menu-pulse-violet' : ''}`}>
                  <strong>{ibitTitle}</strong>
                  <p>{ibitDesc}</p>
                  <div className="fragment-card-actions">
                    <button
                      type="button"
                      className={`fragment-card-btn ${menuHighlightTarget === 'ibit' && ibitFullUnlocked ? 'view-pulse-red' : ''}`}
                      onClick={handleViewIbit}
                    >
                      View
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fragment-item locked" aria-label="Locked fragment">
                  ??? — find it in the fog
                </div>
              )}

              {fragments.ben ? (
                <div className={`fragment-item unlocked ${menuHighlightTarget === 'ben' ? 'menu-pulse-violet' : ''}`}>
                  <strong>Ben's Story</strong>
                  <p>He was only a boy, she was only a girl; A mother's nightmare</p>
                  <div className="fragment-card-actions">
                    <button type="button" className="fragment-card-btn" onClick={handleViewBen}>
                      View
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fragment-item locked" aria-label="Locked artifact">
                  ??? — go deeper
                </div>
              )}

              {entry1Unlocked && (
                <div className={`fragment-item unlocked ${menuHighlightTarget === 'entry1' ? 'menu-pulse-violet' : ''}`}>
                  <strong>What Lies In The Fog</strong>
                  <p>Five strangers and an eerie fog. What happens when...</p>
                  <div className="fragment-card-actions">
                    <button type="button" className="fragment-card-btn" onClick={handleViewEntryOne}>
                      View
                    </button>
                  </div>
                </div>
              )}
            </div>

            <h2>Settings</h2>
            <div className="menu-settings">
              <button onClick={toggleWhispers} aria-pressed={whispersOn}>
                Whispers: {whispersOn ? 'On' : 'Off'}
              </button>
              <button onClick={toggleLowPower} aria-pressed={lowPower}>
                Low Power: {lowPower ? 'On' : 'Off'}
              </button>
              <button onClick={toggleJoystick} aria-pressed={joystickEnabled}>
                Scroll Bar: {joystickEnabled ? 'On' : 'Off'}
              </button>
            </div>

            <h2>Owner</h2>
            <div className="menu-settings">
              {!ownerUnlocked ? (
                <button onClick={handleOwnerUnlock}>
                  Unlock Owner Tools
                </button>
              ) : (
                <>
                  <div className="owner-metrics-panel">
                    <div>
                      <span>Visitors</span>
                      <strong>
                        {ownerMetrics?.visitors ?? '--'}
                      </strong>
                    </div>
                    <div>
                      <span>Unique Emails</span>
                      <strong>
                        {ownerMetrics?.emailSubmissions ?? '--'}
                      </strong>
                    </div>
                    <div>
                      <span>Artifacts</span>
                      <strong>
                        {ownerMetrics?.artifactInteractions ?? '--'}
                      </strong>
                    </div>
                    <div>
                      <span>Events</span>
                      <strong>
                        {ownerMetrics?.eventsTotal ?? '--'}
                      </strong>
                    </div>
                    {ownerMetrics?.currentPeriod && (
                      <div className="owner-metrics-detail owner-metrics-detail--wide">
                        <span>{ownerMetrics.currentPeriod.label}</span>
                        <p>
                          <b>Visitors</b>
                          <em>{ownerMetrics.currentPeriod.visitors ?? 0}</em>
                        </p>
                        <p>
                          <b>Email submissions</b>
                          <em>{ownerMetrics.currentPeriod.emailSubmissions ?? 0}</em>
                        </p>
                        <p>
                          <b>Unique emails</b>
                          <em>{ownerMetrics.currentPeriod.uniqueEmails ?? 0}</em>
                        </p>
                        <p>
                          <b>Artifacts</b>
                          <em>{ownerMetrics.currentPeriod.artifactInteractions ?? 0}</em>
                        </p>
                        <p>
                          <b>Events</b>
                          <em>{ownerMetrics.currentPeriod.eventsTotal ?? 0}</em>
                        </p>
                        <p>
                          <b>Story emails/acquires</b>
                          <em>{ownerMetrics.currentPeriod.archiveMetrics?.totalAcquires ?? 0}</em>
                        </p>
                        <p>
                          <b>18:21 notify</b>
                          <em>
                            {ownerMetrics.currentPeriod.archiveMetrics?.notify1821 ?? 0}
                            {' / '}
                            {ownerMetrics.currentPeriod.archiveMetrics?.notify1821UniqueEmails ?? 0}
                          </em>
                        </p>
                        <small>Story emails since Jul 8: acquired / unique emails / purchases</small>
                        {ownerMetrics.currentPeriod.archiveMetrics?.items?.map((item) => (
                          <p key={item.id}>
                            <b>{item.label}</b>
                            <em>
                              {item.acquires}
                              {' acquired / '}
                              {item.uniqueEmails}
                              {' unique / '}
                              {item.purchases ?? 0}
                              {' purchased'}
                            </em>
                          </p>
                        ))}
                      </div>
                    )}
                    {ownerMetrics?.archiveMetrics && (
                      <div className="owner-metrics-detail owner-metrics-detail--wide">
                        <span>Story Emails / Acquires Lifetime</span>
                        <p>
                          <b>Total story emails/acquires</b>
                          <em>{ownerMetrics.archiveMetrics.totalAcquires ?? 0}</em>
                        </p>
                        <p>
                          <b>Email submissions</b>
                          <em>{ownerMetrics.archiveMetrics.totalEmailSubmissions ?? 0}</em>
                        </p>
                        <p>
                          <b>Unique emails</b>
                          <em>{ownerMetrics.archiveMetrics.totalUniqueEmails ?? 0}</em>
                        </p>
                        <p>
                          <b>Purchases</b>
                          <em>{ownerMetrics.archiveMetrics.totalPurchases ?? 0}</em>
                        </p>
                        <p>
                          <b>Soundtrack purchases</b>
                          <em>{ownerMetrics.archiveMetrics.soundtrackPurchases ?? 0}</em>
                        </p>
                        <p>
                          <b>18:21 notify</b>
                          <em>{ownerMetrics.archiveMetrics.notify1821 ?? 0} / {ownerMetrics.archiveMetrics.notify1821UniqueEmails ?? 0}</em>
                        </p>
                        <small>Per story: acquired / unique emails / purchases</small>
                        {ownerMetrics.archiveMetrics.items?.map((item) => (
                          <p key={item.id}>
                            <b>{item.label}</b>
                            <em>
                              {item.acquires}
                              {' acquired / '}
                              {item.uniqueEmails}
                              {' unique / '}
                              {item.purchases ?? 0}
                              {' purchased'}
                            </em>
                          </p>
                        ))}
                      </div>
                    )}
                    {ownerMetrics?.journeyFunnel?.length > 0 && (
                      <div className="owner-metrics-detail owner-metrics-detail--wide">
                        <span>Unique Visitor Journey · {ownerMetrics.journeyLabel || 'Current baseline'}</span>
                        {ownerMetrics.journeyFunnel.map((item) => {
                          const visitors = ownerMetrics.journeyFunnel?.[0]?.count || 0;
                          const percentage = visitors > 0 ? Math.round((item.count / visitors) * 100) : 0;
                          return (
                            <p key={item.key}>
                              <b>{item.label}</b>
                              <em>{item.count} · {percentage}%</em>
                            </p>
                          );
                        })}
                      </div>
                    )}
                    {ownerMetrics?.artifactBreakdown?.length > 0 && (
                      <div className="owner-metrics-detail">
                        <span>Artifact Details</span>
                        {ownerMetrics.artifactBreakdown.map((item) => (
                          <p key={item.label}>
                            <b>{item.label}</b>
                            <em>{item.count}</em>
                          </p>
                        ))}
                      </div>
                    )}
                    {ownerMetrics?.benFunnel?.length > 0 && (
                      <div className="owner-metrics-detail owner-metrics-detail--wide">
                        <span>Ben Funnel</span>
                        {ownerMetrics.benFunnel.map((item) => (
                          <p key={item.key}>
                            <b>{item.label}</b>
                            <em>{item.count}</em>
                          </p>
                        ))}
                      </div>
                    )}
                    {ownerMetrics?.uniqueEmails?.length > 0 && (
                      <div className="owner-metrics-detail owner-metrics-detail--wide owner-emails-detail">
                        <span>Unique Emails Submitted</span>
                        {ownerMetrics.uniqueEmails.map((email) => (
                          <p key={email}>
                            <b>{email}</b>
                          </p>
                        ))}
                      </div>
                    )}
                    {ownerMetrics?.eventBreakdown?.length > 0 && (
                      <div className="owner-metrics-detail">
                        <span>Event Details</span>
                        {ownerMetrics.eventBreakdown.map((item) => (
                          <p key={item.label}>
                            <b>{item.label}</b>
                            <em>{item.count}</em>
                          </p>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="owner-metrics-refresh"
                      onClick={fetchOwnerMetrics}
                      disabled={ownerMetricsStatus === 'loading'}
                    >
                      {ownerMetricsStatus === 'loading' ? 'Loading' : 'Refresh'}
                    </button>
                    {ownerMetricsStatus === 'error' && (
                      <p>Metrics unavailable until storage is connected.</p>
                    )}
                  </div>
                  <button className="menu-reset-owner" onClick={handleResetTestingState}>
                    Reset My Test Progress
                  </button>
                  <button className="menu-reset-owner" onClick={handleToggleMetricsOptOut}>
                    Exclude This Device: {metricsOptedOut ? 'On' : 'Off'}
                  </button>
                  {!superOwnerUnlocked ? (
                    <button className="menu-reset-owner" onClick={handleSuperOwnerUnlock}>
                      Unlock Global Reset
                    </button>
                  ) : (
                    <button className="menu-reset-owner" onClick={handleGlobalReset}>
                      Reset Site Progress (All Users)
                    </button>
                  )}
                </>
              )}
            </div>

            <a
              className="menu-author-link"
              href="https://ko-fi.com/fogboundv/posts"
              target="_blank"
              rel="noopener noreferrer"
            >
              Author Page
            </a>
          </div>
        </div>
      )}
    </>
  );
}

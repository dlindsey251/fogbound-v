import { useEffect, useRef, useState } from 'react';
import { playLandPlaylist, playLandPreview, playLandTrackFrom, subscribeAudioState, toggleMusicPaused } from '../systems/audioSystem';
import EmbeddedCheckoutPanel from './EmbeddedCheckoutPanel';
import JournalPrototype from './JournalPrototype';
import useGameStore from '../store/useGameStore';
import { getVisitorId, isMetricsOptedOut, trackMetric } from '../utils/metrics';

const LS_ENTRY1_PICKED = 'fogbound_entry1_picked';
const LS_IBIT_FULL = 'fogbound_ibit_full';
const LS_GENE_THEME_UNLOCKED = 'fogbound_soundtrack_gene_theme_unlocked';
const LS_LEGACY_GHOSTS_UNLOCKED = 'fogbound_soundtrack_ghosts_unlocked';
const LS_SOUNDTRACK_BUNDLE_UNLOCKED = 'fogbound_soundtrack_bundle_unlocked';
const LS_LOOP_COUNT = 'fogbound_loop_count';
const LS_LAND_HINT_SEEN = 'fogbound_land_hint_seen';
const LS_LANTERN_LIT = 'fogbound_lantern_lit';
const LS_JOURNAL_OPENED = 'fogbound_journal_opened';
const LS_DOOR_EXPLORED = 'fogbound_door_explored';
const WHAT_LIES_IN_THE_FOG_LINK = 'what-lies-in-the-fog';
const WHAT_LIES_IN_THE_FOG_AUDIO = '/What%20lies%20in%20the%20fog%20audio%20.mp3';
const WHAT_LIES_IN_THE_FOG_PREVIEW_END = 1029.4;
const WHAT_LIES_IN_THE_FOG_CHAPTERS = [
  { title: 'The Cabin in the Forest', start: 0 },
  { title: 'A Mother’s Warning', start: 411.189 },
  { title: 'The Cabin in the Forest II', start: 544.615 },
  { title: 'The Scariest Thing About the Forest', start: 1029.411 },
  { title: 'The Cabin in the Forest III', start: 1244.177 },
  { title: 'King of the Forest', start: 1500.615 },
  { title: 'The Cabin in the Forest IV', start: 1839.822 },
];

const HOTSPOTS = [
  {
    id: 'door',
    label: 'Explore',
    action: 'door',
  },
  {
    id: 'gramophone',
    label: 'Listen',
    action: 'soundtrack',
  },
  {
    id: 'bookshelf',
    label: 'Read',
    action: 'archive',
  },
  {
    id: 'watch',
    label: 'The watch',
    action: 'lore',
  },
];

const ARCHIVE_ITEMS = [
  {
    title: 'Recovered Entries: 18:21',
    artifactId: '18-21',
    featured: true,
    teaser: "The fog began before the forest. Four recovered accounts trace the promises, wounds, and memories that led J, Kelly, and Tail to Hell's Doorstep.",
    body: "The complete pre-fog saga.\n\nIncludes Entry 0, Entry 1, Entry 2, and Kelly's recovered account—in their intended reading order.\n\nThree travelers cross Hell's Doorstep toward a forest swallowed by violet fog. One searches for something he lost. One hides behind laughter. One carries a wound that refuses to heal.\n\nBound together by old promises and the teachings of a man they can never quite leave behind, J, Kelly, and Tail must confront the memories, regrets, and unseen burdens that travel with them. As tensions rise and old scars are reopened, each is forced to decide what they're willing to carry—and what they're willing to let die.",
    href: '/Full%201821.pdf',
    download: 'Full 1821.pdf',
    purchase: true,
  },
  {
    title: "Entry 0: Ben's Story",
    artifactId: 'ben-story',
    body: "He was only a boy, she was only a girl; A mother's nightmare.",
    href: '/Fogbound%20V%20Entry%20Stories.pdf',
    download: 'Fogbound V Entry Stories.pdf',
  },
  {
    title: 'Entry 1: Nested Dolls',
    artifactId: 'nested-dolls',
    body: '"You believe in heaven?"\n\nAs J and Kelly peel back the layers of a seemingly simple job, each truth reveals another beneath it.',
    href: '/Nested%20Dolls--.pdf',
    download: 'Nested Dolls--.pdf',
  },
];

const SOUNDTRACK_ITEMS = [
  {
    title: 'What Lies in the Fog',
    src: WHAT_LIES_IN_THE_FOG_AUDIO,
    whatLiesAudio: true,
  },
  {
    title: "Parlez-Moi d'Amour",
    src: '/Parlez-Moi%20d%27Amour.wav',
    available: true,
  },
  {
    title: 'Ghosts',
    src: '/Ghosts.mp3',
    premium: true,
    purchasable: false,
  },
  {
    title: 'J Theme',
    src: '/JTheme.mp3',
    premium: true,
    purchasable: false,
  },
  {
    title: 'Kelly Theme',
    src: '/KellyTheme.mp3',
    premium: true,
    purchasable: false,
  },
  {
    title: 'Tail Theme',
    src: '/TailTheme.mp3',
    premium: true,
    purchasable: false,
  },
  {
    title: "18:21 (Gene's Theme)",
    unlockKey: LS_GENE_THEME_UNLOCKED,
    src: '/18.21%28Gene%27s%29.wav',
  },
];

const DISCOVERED_ITEMS = [
  {
    id: 'ibit',
    title: 'Guide to the Fog',
    artifactId: 'ibit',
    body: 'Ibit Shaw left behind notes on what the fog hides, and what it repeats.',
    href: '/Guide%20To%20The%20Fog.pdf',
    download: 'Guide To The Fog.pdf',
  },
  {
    id: 'entry1',
    title: 'What Lies In The Fog',
    artifactId: 'entry1',
    body: 'Five strangers enter an eerie fog. Decide what the recovered account is worth to you.',
    href: '/What%20Lies%20In%20The%20Fog-%20Veil.pdf',
    download: 'What lies in the fog- veil.pdf',
    purchase: true,
    payWhatYouWant: true,
  },
];

function isCoarsePointer() {
  return window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
}

function hasGeneThemeUnlocked(loopCount = 0) {
  const storedLoops = Number(localStorage.getItem(LS_LOOP_COUNT) || 0);
  const effectiveLoops = Math.max(Number(loopCount) || 0, Number.isFinite(storedLoops) ? storedLoops : 0);
  return (
    effectiveLoops >= 1
    || localStorage.getItem(LS_GENE_THEME_UNLOCKED) === '1'
    || localStorage.getItem(LS_LEGACY_GHOSTS_UNLOCKED) === '1'
  );
}

function shouldShowLibraryThreshold() {
  const params = new URLSearchParams(window.location.search);
  return !['open', 'entry', 'checkout', 'artifact', 'session_id', 'play']
    .some((key) => params.has(key));
}

export default function CabinLanding({ onEnter }) {
  const landingRef = useRef(null);
  const stageRef = useRef(null);
  const fragments = useGameStore((s) => s.fragments);
  const loopCount = useGameStore((s) => s.loopCount);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
  });
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [thresholdVisible, setThresholdVisible] = useState(shouldShowLibraryThreshold);
  const [thresholdOpening, setThresholdOpening] = useState(false);
  const [journalPrototypeOpen, setJournalPrototypeOpen] = useState(false);
  const [journalGuidanceVisible, setJournalGuidanceVisible] = useState(
    () => localStorage.getItem(LS_JOURNAL_OPENED) !== '1'
  );
  const [roomAwake, setRoomAwake] = useState(false);
  const [lanternLit, setLanternLit] = useState(
    () => localStorage.getItem(LS_LANTERN_LIT) === '1'
  );
  const [doorExplored, setDoorExplored] = useState(
    () => localStorage.getItem(LS_DOOR_EXPLORED) === '1'
  );
  const [hintVisible, setHintVisible] = useState(
    () => localStorage.getItem(LS_LAND_HINT_SEEN) !== '1'
  );
  const [panel, setPanel] = useState(null);
  const [archiveDetail, setArchiveDetail] = useState(null);
  const [archiveDetailExpanded, setArchiveDetailExpanded] = useState(false);
  const [archiveEmail, setArchiveEmail] = useState('');
  const [archiveEmailStatus, setArchiveEmailStatus] = useState('idle');
  const [archiveEmailMessage, setArchiveEmailMessage] = useState('');
  const [archiveEntitlements, setArchiveEntitlements] = useState([]);
  const [archiveRestoreEmail, setArchiveRestoreEmail] = useState('');
  const [archiveRestoreStatus, setArchiveRestoreStatus] = useState('idle');
  const [archiveRestoreMessage, setArchiveRestoreMessage] = useState('');
  const [archiveContribution, setArchiveContribution] = useState('4.99');
  const [geneThemeUnlocked, setGeneThemeUnlocked] = useState(
    () => hasGeneThemeUnlocked()
  );
  const [soundtrackBundleUnlocked, setSoundtrackBundleUnlocked] = useState(
    () => localStorage.getItem(LS_SOUNDTRACK_BUNDLE_UNLOCKED) === '1'
  );
  const [soundtrackPurchaseStatus, setSoundtrackPurchaseStatus] = useState('idle');
  const [soundtrackPurchaseMessage, setSoundtrackPurchaseMessage] = useState('');
  const [soundtrackPriceLabel, setSoundtrackPriceLabel] = useState('Price shown at checkout');
  const [checkoutPanel, setCheckoutPanel] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [audioState, setAudioState] = useState({ zone: 'land', paused: false });
  const [whatLiesChapter, setWhatLiesChapter] = useState('0');
  const [entryOneDiscovered, setEntryOneDiscovered] = useState(
    () => localStorage.getItem(LS_ENTRY1_PICKED) === '1'
  );

  useEffect(() => {
    const closePanel = (event) => {
      if (event.key === 'Escape') {
        setPanel(null);
        setActiveHotspot(null);
      }
    };
    window.addEventListener('keydown', closePanel);
    return () => window.removeEventListener('keydown', closePanel);
  }, []);

  useEffect(() => subscribeAudioState(setAudioState), []);

  useEffect(() => {
    if (thresholdVisible) {
      trackMetric('entrance_guided_impression', { variant: 'guided_v1' });
    }
  }, []);

  useEffect(() => {
    if (!roomAwake) return undefined;
    const timeout = window.setTimeout(() => setRoomAwake(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [roomAwake]);

  const openLibrary = () => {
    if (thresholdOpening) return;
    trackMetric('library_open', { variant: 'guided_v1' });
    trackMetric('library_open_guided_v1');
    setThresholdOpening(true);
    window.setTimeout(() => {
      setThresholdVisible(false);
      setThresholdOpening(false);
      setRoomAwake(true);
    }, 850);
  };

  const openJournal = (source = 'room') => {
    trackMetric('journal_open', { source });
    localStorage.setItem(LS_JOURNAL_OPENED, '1');
    setJournalGuidanceVisible(false);
    setPanel(null);
    setJournalPrototypeOpen(true);
  };

  const applyArchiveEntitlements = (entitlements = []) => {
    const next = Array.isArray(entitlements) ? entitlements : [];
    setArchiveEntitlements(next);
    if (next.includes('soundtrack-bundle')) {
      localStorage.setItem(LS_SOUNDTRACK_BUNDLE_UNLOCKED, '1');
      setSoundtrackBundleUnlocked(true);
    }
  };

  const refreshArchiveSession = async () => {
    try {
      const res = await fetch('/api/archive-session');
      const data = await res.json();
      if (res.ok && data?.ok) applyArchiveEntitlements(data.entitlements);
    } catch (_err) {
      // The room remains fully usable when recognition is temporarily unavailable.
    }
  };

  useEffect(() => {
    refreshArchiveSession();
  }, []);

  useEffect(() => {
    let disposed = false;
    fetch('/api/purchase-price?artifactId=soundtrack-bundle')
      .then((res) => res.json())
      .then((data) => {
        if (disposed || !data?.ok || !Number.isFinite(data?.unitAmount)) return;
        const formatted = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: String(data.currency || 'usd').toUpperCase(),
        }).format(data.unitAmount / 100);
        setSoundtrackPriceLabel(formatted);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const artifactId = params.get('artifact');
    const sessionId = params.get('session_id');
    const openPanel = params.get('open');
    const selectedEntry = params.get('entry');
    const archiveReturn = params.get('archive');
    const requestedRecording = params.get('play');

    if (requestedRecording === WHAT_LIES_IN_THE_FOG_LINK) {
      setActiveHotspot('gramophone');
      setPanel(null);
      playLandPreview(WHAT_LIES_IN_THE_FOG_AUDIO, WHAT_LIES_IN_THE_FOG_PREVIEW_END);
      trackMetric('special_recording_play', { recording: requestedRecording });
      trackMetric('what_lies_audio_preview_play', { source: 'special_link' });
      return;
    }

    if (archiveReturn) {
      setPanel('archive');
      setArchiveRestoreStatus(archiveReturn === 'restored' ? 'sent' : 'error');
      setArchiveRestoreMessage(
        archiveReturn === 'restored'
          ? 'Archive Key recognized. This room now remembers what belongs to you.'
          : 'That return path has expired. Request a new Archive Key below.'
      );
      refreshArchiveSession();
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (!checkout && openPanel === 'archive') {
      setPanel('archive');
      if (selectedEntry) {
        const item = ARCHIVE_ITEMS.find((entry) => entry.artifactId === selectedEntry);
        if (item) setArchiveDetail(item);
      }
      return;
    }

    if (!checkout) return;

    if ((checkout === 'success' || checkout === 'complete') && sessionId) {
      fetch('/api/archive-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok) {
            applyArchiveEntitlements(data.entitlements);
            if (artifactId === 'soundtrack-bundle') {
              setSoundtrackPurchaseStatus('sent');
              setSoundtrackPurchaseMessage('Purchase verified. Your soundtrack and companion are unlocked below.');
            }
          }
        })
        .catch(() => {});
    }

    if (artifactId === 'soundtrack-bundle') {
      setPanel('soundtrack');
      if (checkout === 'success' || checkout === 'complete') {
        trackMetric('checkout_complete', { artifactId });
        localStorage.setItem(LS_SOUNDTRACK_BUNDLE_UNLOCKED, '1');
        setSoundtrackBundleUnlocked(true);
        setSoundtrackPurchaseStatus('sent');
        setSoundtrackPurchaseMessage('Checkout complete. Verifying your Archive Key…');
      } else {
        setSoundtrackPurchaseStatus('error');
        setSoundtrackPurchaseMessage('Checkout was canceled.');
      }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const item = ARCHIVE_ITEMS.find((entry) => entry.artifactId === artifactId);
    setPanel('archive');
    if (item) setArchiveDetail(item);
    if (checkout === 'success' || checkout === 'complete') {
      trackMetric('checkout_complete', { artifactId });
    }
    setArchiveEmailStatus((checkout === 'success' || checkout === 'complete') ? 'sent' : 'error');
    setArchiveEmailMessage(
      (checkout === 'success' || checkout === 'complete')
        ? 'Checkout complete. Your story will be sent to the email used at checkout.'
        : 'Checkout was canceled.'
    );
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    setGeneThemeUnlocked(hasGeneThemeUnlocked(loopCount));
  }, [loopCount]);

  useEffect(() => {
    const refreshEntryOne = () => {
      setEntryOneDiscovered(localStorage.getItem(LS_ENTRY1_PICKED) === '1');
      setGeneThemeUnlocked(hasGeneThemeUnlocked(loopCount));
      setSoundtrackBundleUnlocked(localStorage.getItem(LS_SOUNDTRACK_BUNDLE_UNLOCKED) === '1');
    };
    window.addEventListener('fogbound-entry1-picked', refreshEntryOne);
    window.addEventListener('storage', refreshEntryOne);
    return () => {
      window.removeEventListener('fogbound-entry1-picked', refreshEntryOne);
      window.removeEventListener('storage', refreshEntryOne);
    };
  }, [loopCount]);

  useEffect(() => {
    if (!isCoarsePointer()) return;
    const landing = landingRef.current;
    const stage = stageRef.current;
    if (!landing || !stage) return;

    const positionNearArchive = () => {
      const scrollableWidth = Math.max(0, stage.offsetWidth - landing.clientWidth);
      if (!scrollableWidth) return;
      const archiveCenter = stage.offsetWidth * 0.62;
      landing.scrollLeft = Math.max(0, Math.min(scrollableWidth, archiveCenter - (landing.clientWidth / 2)));
    };

    const frameId = requestAnimationFrame(positionNearArchive);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePointerDown = (event) => {
    if (!isCoarsePointer()) return;
    if (event.target.closest?.('.cabin-panel')) return;
    if (hintVisible) {
      setHintVisible(false);
      localStorage.setItem(LS_LAND_HINT_SEEN, '1');
    }
    const landing = landingRef.current;
    if (!landing) return;
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: landing.scrollLeft,
    };
    landing.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const landing = landingRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || !landing) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      drag.moved = true;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
      landing.scrollLeft = drag.scrollLeft - deltaX;
    }
  };

  const handlePointerEnd = (event) => {
    const landing = landingRef.current;
    const wasTap = (
      isCoarsePointer()
      && dragRef.current.active
      && !dragRef.current.moved
      && !event.target.closest?.('.cabin-panel')
    );
    if (landing && dragRef.current.pointerId === event.pointerId) {
      landing.releasePointerCapture?.(event.pointerId);
    }
    if (wasTap) {
      setRoomAwake(true);
    }
    window.setTimeout(() => {
      dragRef.current.active = false;
      dragRef.current.moved = false;
      dragRef.current.pointerId = null;
    }, 0);
  };

  const playDoorAudio = () => {
    try {
      const audio = new Audio('/night.mp3');
      audio.volume = 0.18;
      audio.play().catch(() => {});
    } catch (_err) {
      // Audio is optional for the transition.
    }
  };

  const enterForest = () => {
    if (leaving) return;
    localStorage.setItem(LS_DOOR_EXPLORED, '1');
    setDoorExplored(true);
    setPanel(null);
    setLeaving(true);
    playDoorAudio();
    window.setTimeout(() => {
      onEnter();
    }, 1050);
  };

  const openHotspot = (hotspot) => {
    setRoomAwake(false);
    if (hotspot.action === 'door') {
      enterForest();
      return;
    }
    if (hotspot.action === 'archive') {
      setArchiveDetail(null);
      setArchiveEmail('');
      setArchiveEmailStatus('idle');
      setArchiveEmailMessage('');
    }
    setPanel(hotspot.action);
  };

  const handleHotspotPress = (hotspot) => {
    if (dragRef.current.moved) return;
    setRoomAwake(true);
    if (isCoarsePointer() && activeHotspot !== hotspot.id) {
      setActiveHotspot(hotspot.id);
      return;
    }
    openHotspot(hotspot);
  };

  const openArchiveEntry = (artifactId) => {
    if (dragRef.current.moved) return;
    const item = ARCHIVE_ITEMS.find((entry) => entry.artifactId === artifactId);
    setRoomAwake(false);
    setActiveHotspot(null);
    setArchiveDetail(item || null);
    setArchiveDetailExpanded(false);
    setArchiveEmail('');
    setArchiveEmailStatus('idle');
    setArchiveEmailMessage('');
    setPanel('archive');
  };

  const open1821Reminder = () => openArchiveEntry('18-21');
  const openRecoveredJournal = () => openArchiveEntry('18-21');

  const discoveredItems = DISCOVERED_ITEMS
    .filter((item) => {
      if (item.id === 'entry1') return entryOneDiscovered;
      return !!fragments?.[item.id];
    })
    .map((item) => {
      if (item.id === 'ibit' && localStorage.getItem(LS_IBIT_FULL) !== '1') {
        return {
          ...item,
          title: 'Guide to the Fog: Fragment',
          body: "Part of a mad man's notes.",
          href: null,
          download: null,
        };
      }
      return item;
    });

  const showArchiveDetail = (item) => {
    setArchiveDetail(item);
    setArchiveDetailExpanded(false);
    setArchiveEmail('');
    setArchiveEmailStatus('idle');
    setArchiveEmailMessage('');
    setArchiveContribution('4.99');
  };

  const handleArchiveEmailSubmit = async (event) => {
    event.preventDefault();
    if (!archiveDetail?.artifactId || !archiveEmail.trim()) return;
    setArchiveEmailStatus('submitting');
    setArchiveEmailMessage('');

    try {
      const res = await fetch('/api/artifact-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: archiveEmail.trim(),
          artifactId: archiveDetail.artifactId,
          visitorId: isMetricsOptedOut() ? '' : getVisitorId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not send artifact.');
      }
      setArchiveEmailStatus('sent');
      if (archiveDetail.notifyOnly) {
        setArchiveEmailMessage("You're on the list. We'll email you when 18:21 is available.");
      } else {
        localStorage.setItem(LS_GENE_THEME_UNLOCKED, '1');
        setGeneThemeUnlocked(true);
        setArchiveEmailMessage(
          data.emailed
            ? "Sent to your email. 18:21 (Gene's Theme) has surfaced in Soundtrack."
            : "Your email was saved. 18:21 (Gene's Theme) has surfaced in Soundtrack."
        );
      }
    } catch (err) {
      setArchiveEmailStatus('error');
      setArchiveEmailMessage(err?.message || 'Could not send artifact.');
    }
  };

  const openEmbeddedCheckout = async ({ artifactId, itemName, email = '', amountCents }) => {
    const isSoundtrackCheckout = artifactId === 'soundtrack-bundle';
    trackMetric('checkout_open', { artifactId });
    if (isSoundtrackCheckout) {
      setSoundtrackPurchaseStatus('submitting');
      setSoundtrackPurchaseMessage('');
    }
    setCheckoutPanel({
      artifactId,
      itemName,
      clientSecret: '',
      error: '',
    });

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          artifactId,
          email,
          visitorId: isMetricsOptedOut() ? '' : getVisitorId(),
          amountCents,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json().catch(() => ({}))
        : {};
      if (!res.ok || !data?.ok || !data?.clientSecret) {
        throw new Error(
          data?.error
          || 'Checkout API is not running here. Test purchases on the live Vercel site or with vercel dev.'
        );
      }
      setCheckoutPanel({
        artifactId,
        itemName,
        clientSecret: data.clientSecret,
        error: '',
      });
      if (isSoundtrackCheckout) setSoundtrackPurchaseStatus('idle');
    } catch (err) {
      const message = err?.message || 'Could not start checkout.';
      if (isSoundtrackCheckout) {
        setSoundtrackPurchaseStatus('error');
        setSoundtrackPurchaseMessage(message);
      }
      setCheckoutPanel({
        artifactId,
        itemName,
        clientSecret: '',
        error: message,
      });
    }
  };

  const handleSoundtrackPurchase = () => {
    openEmbeddedCheckout({
      artifactId: 'soundtrack-bundle',
      itemName: 'Fogbound V Soundtrack',
    });
  };

  const handleArchivePurchase = (item) => {
    if (item.artifactId === 'entry1') {
      trackMetric('what_lies_audio_acquire_start', { source: 'archive' });
    }
    const amountCents = item.payWhatYouWant
      ? Math.round(Number(archiveContribution) * 100)
      : undefined;
    openEmbeddedCheckout({
      artifactId: item.artifactId,
      itemName: item.title,
      email: archiveEmail.trim(),
      amountCents,
    });
  };

  const handleArchiveRestore = async (event) => {
    event.preventDefault();
    if (!archiveRestoreEmail.trim()) return;
    setArchiveRestoreStatus('submitting');
    setArchiveRestoreMessage('');
    try {
      const res = await fetch('/api/archive-restore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: archiveRestoreEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error('The archive could not send a return path.');
      setArchiveRestoreStatus('sent');
      setArchiveRestoreMessage(data.message);
    } catch (err) {
      setArchiveRestoreStatus('error');
      setArchiveRestoreMessage(err?.message || 'The archive could not send a return path.');
    }
  };

  const isSoundtrackItemUnlocked = (item) => (
    (item.whatLiesAudio && archiveEntitlements.includes('entry1'))
    || item.available
    || (item.premium && soundtrackBundleUnlocked)
    || (item.unlockKey && geneThemeUnlocked)
  );

  const getAvailableSoundtrackSources = () => (
    SOUNDTRACK_ITEMS
      .filter(isSoundtrackItemUnlocked)
      .map((item) => item.src)
      .filter(Boolean)
  );

  const featuredArchiveItem = ARCHIVE_ITEMS.find((item) => item.featured);
  const owns1821 = archiveEntitlements.includes('18-21');
  const ownsSoundtrack = archiveEntitlements.includes('soundtrack-bundle');
  const ownsWhatLiesAudio = archiveEntitlements.includes('entry1');
  const ownsArchiveDetail = Boolean(
    archiveDetail?.artifactId && archiveEntitlements.includes(archiveDetail.artifactId)
  );
  const journalEntries = ARCHIVE_ITEMS.filter((item) => !item.featured);
  const journalPreviewEnabled = new URLSearchParams(window.location.search).get('journal-preview') === '1';

  return (
    <section
      ref={landingRef}
      className={`cabin-landing cabin-landing--${activeHotspot || 'idle'} ${roomAwake ? 'is-awake' : ''} ${lanternLit ? 'is-lantern-lit' : ''} ${doorExplored ? 'is-door-explored' : 'is-door-unexplored'} ${leaving ? 'is-leaving' : ''} ${!thresholdVisible && !panel ? 'is-journal-guiding' : ''} ${journalGuidanceVisible ? 'is-first-visit' : ''} ${journalPreviewEnabled ? 'is-journal-preview' : ''} ${journalPrototypeOpen ? 'has-journal-prototype' : ''}`}
      aria-label="Fogbound V study"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="cabin-stage" ref={stageRef}>
        <div className="cabin-landing__image" aria-hidden="true" />
        <div className="cabin-landing__shade" aria-hidden="true" />

        <button
          className="cabin-lantern-toggle"
          type="button"
          aria-label={lanternLit ? 'Dim the lantern' : 'Light the lantern'}
          aria-pressed={lanternLit}
          onClick={() => {
            setLanternLit((current) => {
              const next = !current;
              localStorage.setItem(LS_LANTERN_LIT, next ? '1' : '0');
              return next;
            });
          }}
        >
          <span>{lanternLit ? 'Dim the lantern' : 'Light the lantern'}</span>
        </button>

        <button
          className="cabin-desk-entry"
          type="button"
          aria-label="Open the Recovered Entries journal"
          onClick={() => openJournal('room')}
        >
          <span>Begin here · Open the Journal</span>
        </button>

        {HOTSPOTS.map((hotspot) => (
          <button
            key={hotspot.id}
            className={`cabin-hotspot cabin-hotspot--${hotspot.id}`}
            type="button"
            aria-label={hotspot.label}
            onClick={() => handleHotspotPress(hotspot)}
            onFocus={() => setActiveHotspot(hotspot.id)}
            onMouseEnter={() => setActiveHotspot(hotspot.id)}
            onMouseLeave={() => setActiveHotspot((current) => (current === hotspot.id ? null : current))}
          >
            <span>{hotspot.label}</span>
          </button>
        ))}

        <button
          className="cabin-1821-reminder"
          type="button"
          aria-label="Open 18:21"
          title="18:21"
          onClick={open1821Reminder}
        >
          <span className="cabin-1821-reminder__pin" aria-hidden="true" />
          <span className="cabin-1821-reminder__writing">18:21</span>
        </button>

        <div className="cabin-glint cabin-glint--watch" aria-hidden="true" />
        <div className="cabin-record" aria-hidden="true" />
        <div className="cabin-lantern-bloom" aria-hidden="true" />
        <div className="cabin-journal-guide" aria-hidden="true" />
        <div className="cabin-door-fog" aria-hidden="true" />
      </div>

      {thresholdVisible && (
        <div
          className={`cabin-threshold ${thresholdOpening ? 'is-opening' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cabin-threshold-title"
          aria-describedby="cabin-threshold-description"
        >
          <div className="cabin-threshold__door cabin-threshold__door--left" aria-hidden="true" />
          <div className="cabin-threshold__door cabin-threshold__door--right" aria-hidden="true" />
          <div className="cabin-threshold__content" onClick={openLibrary}>
            <div className="cabin-threshold__lantern" aria-hidden="true" />
            <div className="cabin-threshold__journal-mark" aria-hidden="true" />
            <p className="cabin-threshold__kicker">Recovered archive</p>
            <h1 id="cabin-threshold-title">Fogbound V</h1>
            <p id="cabin-threshold-description">
              Recovered stories from a forgotten world.
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openLibrary();
              }}
            >
              <span className="cabin-threshold__cta-title">Enter the Library</span>
              <span className="cabin-threshold__cta-subtitle">Begin with the recovered journal</span>
            </button>
            <p className="cabin-threshold__reassurance">Free to explore · no account required</p>
          </div>
        </div>
      )}

      {hintVisible && !panel && (
        <div className="cabin-mobile-hint" aria-hidden="true">
          Drag to explore the room
        </div>
      )}

      {panel && (
        <div
          className="cabin-panel"
          role="dialog"
          aria-modal="true"
          aria-label={panel === 'archive' ? 'Recovered Shelf' : panel}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onPointerCancel={(event) => event.stopPropagation()}
        >
          <button className="cabin-panel__close" type="button" aria-label="Close" onClick={() => setPanel(null)}>
            ×
          </button>

          {panel === 'archive' && (
            <>
              <h2>Recovered Shelf</h2>
              <button
                className="cabin-open-journal"
                type="button"
                onClick={() => openJournal('recovered_shelf')}
              >
                <small>Begin with the artifact</small>
                <span>Open the illustrated journal</span>
              </button>
              <h3>Start here</h3>
              <ul className="cabin-archive-list">
                {featuredArchiveItem && (
                  <li key={featuredArchiveItem.title}>
                    <button
                      className="cabin-archive-item cabin-archive-item--featured"
                      type="button"
                      onClick={() => showArchiveDetail(featuredArchiveItem)}
                    >
                      <span className="cabin-archive-item__copy">
                        <small className="cabin-archive-item__eyebrow">★ Start here</small>
                        <span className="cabin-archive-item__title">{featuredArchiveItem.title}</span>
                        <small className="cabin-archive-item__contents">
                          Entries 0–2 + Kelly’s recovered account
                        </small>
                      </span>
                      <span className="cabin-archive-meta">
                        <small className="cabin-archive-purchase">
                          {owns1821 ? 'Recovered · Open' : '$4.99 · Open'}
                        </small>
                      </span>
                    </button>
                  </li>
                )}
              </ul>

              <h3>Inside the journal</h3>
              <ul className="cabin-archive-list cabin-archive-list--journal">
                {journalEntries.map((item, index) => (
                  <li key={item.title}>
                    {item.href ? (
                      <button
                        className="cabin-archive-item"
                        type="button"
                        onClick={() => showArchiveDetail(item)}
                      >
                        <span className="cabin-archive-item__copy">
                          <span className="cabin-archive-item__title">{item.title}</span>
                        </span>
                        <span className="cabin-archive-meta">
                          <small className="cabin-archive-order">
                            {index === 0 ? 'Begin' : 'Continue'}
                          </small>
                        </span>
                      </button>
                    ) : (
                      item.title
                    )}
                  </li>
                ))}
              </ul>

              <h3>Discovered in the fog</h3>
              {discoveredItems.length > 0 ? (
                <ul className="cabin-archive-list">
                  {discoveredItems.map((item) => (
                    <li key={item.id}>
                      <button className="cabin-archive-item" type="button" onClick={() => showArchiveDetail(item)}>
                        <span>{item.title}</span>
                        {item.href ? (
                          <span className="cabin-archive-meta">
                            {item.payWhatYouWant
                              ? <small className="cabin-archive-free">Choose your price</small>
                              : (item.artifactId && <small className="cabin-archive-free">Read</small>)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cabin-archive-empty">Nothing has surfaced yet.</p>
              )}

              {archiveDetail && (
                <div className="cabin-archive-detail">
                  <h4>{archiveDetail.title}</h4>
                  {archiveDetail.teaser ? (
                    <>
                      <p className="cabin-archive-teaser">{archiveDetail.teaser}</p>
                      {archiveDetailExpanded && (
                        <p className="cabin-archive-expanded">{archiveDetail.body}</p>
                      )}
                      <button
                        className="cabin-archive-read-more"
                        type="button"
                        aria-expanded={archiveDetailExpanded}
                        onClick={() => setArchiveDetailExpanded((expanded) => !expanded)}
                      >
                        {archiveDetailExpanded ? 'Fold the account' : 'Unfold the account'}
                      </button>
                    </>
                  ) : (
                    <p>{archiveDetail.body}</p>
                  )}
                  {archiveDetail.artifactId && (
                    archiveDetail.purchase ? (
                      <div className="cabin-archive-email">
                        {archiveDetail.payWhatYouWant && !ownsArchiveDetail && (
                          <div className="cabin-contribution">
                            <label htmlFor="archive-contribution">Choose your contribution</label>
                            <div className="cabin-contribution__amount">
                              <span aria-hidden="true">$</span>
                              <input
                                id="archive-contribution"
                                type="number"
                                inputMode="decimal"
                                min="1"
                                max="100"
                                step="0.01"
                                value={archiveContribution}
                                onChange={(event) => setArchiveContribution(event.target.value)}
                                aria-describedby="archive-contribution-note"
                                required
                              />
                            </div>
                            <small id="archive-contribution-note">$1 minimum · suggested $4.99</small>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (ownsArchiveDetail) {
                              window.open(archiveDetail.href, '_blank', 'noopener,noreferrer');
                            } else {
                              handleArchivePurchase(archiveDetail);
                            }
                          }}
                          disabled={
                            soundtrackPurchaseStatus === 'submitting'
                            || (archiveDetail.payWhatYouWant && (
                              Number(archiveContribution) < 1
                              || Number(archiveContribution) > 100
                            ))
                          }
                        >
                          {ownsArchiveDetail
                            ? 'Open recovered account'
                            : (soundtrackPurchaseStatus === 'submitting'
                                ? 'Opening'
                                : (archiveDetail.payWhatYouWant ? 'Continue to checkout' : 'Purchase'))}
                        </button>
                        {archiveEmailMessage && (
                          <p className={`cabin-archive-email-status is-${archiveEmailStatus}`}>
                            {archiveEmailMessage}
                          </p>
                        )}
                      </div>
                    ) : (
                      <form
                        className="cabin-archive-email"
                        onSubmit={handleArchiveEmailSubmit}
                      >
                        <label htmlFor="archive-email">Email address</label>
                        <div className="cabin-archive-email-row">
                          <input
                            id="archive-email"
                            type="email"
                            value={archiveEmail}
                            onChange={(event) => {
                              setArchiveEmail(event.target.value);
                              if (archiveEmailStatus !== 'submitting') {
                                setArchiveEmailStatus('idle');
                                setArchiveEmailMessage('');
                              }
                            }}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            disabled={archiveEmailStatus === 'submitting' || archiveEmailStatus === 'sent'}
                          />
                          <button type="submit" disabled={archiveEmailStatus === 'submitting'}>
                            {archiveEmailStatus === 'submitting'
                              ? 'Sending'
                              : (archiveDetail.notifyOnly ? 'Notify me' : 'Send')}
                          </button>
                        </div>
                        {archiveEmailMessage && (
                          <p className={`cabin-archive-email-status is-${archiveEmailStatus}`}>
                            {archiveEmailMessage}
                          </p>
                        )}
                      </form>
                    )
                  )}
                </div>
              )}

              <div className={`cabin-archive-key ${archiveEntitlements.length ? 'is-recognized' : ''}`}>
                {archiveEntitlements.length ? (
                  <>
                    <small>Archive Key recognized</small>
                    <strong>The archive remembers you.</strong>
                    <span>
                      {archiveEntitlements.includes('18-21') && '18:21 is in your recovered shelf.'}
                      {archiveEntitlements.includes('18-21') && archiveEntitlements.includes('soundtrack-bundle') && ' '}
                      {archiveEntitlements.includes('soundtrack-bundle') && 'The complete soundtrack is unlocked.'}
                    </span>
                  </>
                ) : (
                  <form onSubmit={handleArchiveRestore}>
                    <small>Already acquired something here?</small>
                    <label htmlFor="archive-restore-email">Restore your Archive Key</label>
                    <div className="cabin-archive-email-row">
                      <input
                        id="archive-restore-email"
                        type="email"
                        value={archiveRestoreEmail}
                        onChange={(event) => setArchiveRestoreEmail(event.target.value)}
                        placeholder="Email used at checkout"
                        autoComplete="email"
                        required
                        disabled={archiveRestoreStatus === 'submitting'}
                      />
                      <button type="submit" disabled={archiveRestoreStatus === 'submitting'}>
                        {archiveRestoreStatus === 'submitting' ? 'Searching' : 'Send key'}
                      </button>
                    </div>
                  </form>
                )}
                {archiveRestoreMessage && (
                  <p className={`cabin-archive-email-status is-${archiveRestoreStatus}`}>
                    {archiveRestoreMessage}
                  </p>
                )}
              </div>
            </>
          )}

          {panel === 'soundtrack' && (
            <>
              <h2>Soundtrack</h2>
              {!soundtrackBundleUnlocked && (
                <div className="cabin-soundtrack-volume">
                  <small>Recovered recording</small>
                  <strong>Complete Fogbound V Soundtrack</strong>
                  <span>Six tracks + companion PDF · {soundtrackPriceLabel} · unlocked immediately</span>
                  <button
                    type="button"
                    onClick={handleSoundtrackPurchase}
                    disabled={soundtrackPurchaseStatus === 'submitting'}
                  >
                    {soundtrackPurchaseStatus === 'submitting' ? 'Opening checkout' : 'Acquire soundtrack'}
                  </button>
                </div>
              )}
              {ownsSoundtrack && (
                <div className="cabin-soundtrack-delivery">
                  <small>Archive Key recognized</small>
                  <strong>Your recovered soundtrack</strong>
                  <span>Download the companion now, then choose any recording below.</span>
                  <a
                    href="/Fogbound%20V%20Soundtrack%20Companion.pdf"
                    download="Carry.pdf"
                  >
                    Download Carry
                  </a>
                </div>
              )}
              <ul>
                {SOUNDTRACK_ITEMS.map((item) => {
                  const unlocked = isSoundtrackItemUnlocked(item);
                  return (
                    <li key={item.title}>
                      {unlocked ? (
                      <div className="cabin-track-row">
                        <span>
                          {item.title}
                          {item.whatLiesAudio && ownsWhatLiesAudio && (
                            <label className="cabin-track-chapter-picker">
                              <small>Start from chapter</small>
                              <select
                                value={whatLiesChapter}
                                onChange={(event) => {
                                  const start = Number(event.target.value);
                                  const chapter = WHAT_LIES_IN_THE_FOG_CHAPTERS.find((entry) => entry.start === start);
                                  setWhatLiesChapter(event.target.value);
                                  playLandTrackFrom(item.src, start);
                                  trackMetric('what_lies_audio_chapter_play', {
                                    chapter: chapter?.title || 'Unknown',
                                    start: String(start),
                                    source: 'gramophone',
                                  });
                                }}
                              >
                                {WHAT_LIES_IN_THE_FOG_CHAPTERS.map((chapter) => (
                                  <option key={chapter.title} value={String(chapter.start)}>
                                    {chapter.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </span>
                        <span className="cabin-track-actions">
                          <button
                            className="cabin-track-action"
                            type="button"
                            onClick={() => {
                              if (item.whatLiesAudio) {
                                playLandTrackFrom(item.src, Number(whatLiesChapter));
                                trackMetric('what_lies_audio_full_play', { source: 'gramophone' });
                              } else {
                                playLandPlaylist(getAvailableSoundtrackSources(), item.src);
                              }
                            }}
                          >
                            Play
                          </button>
                          <button
                            className="cabin-track-action"
                            type="button"
                            onClick={toggleMusicPaused}
                          >
                            {audioState.paused ? 'Resume' : 'Pause'}
                          </button>
                          {(ownsSoundtrack || (item.whatLiesAudio && ownsWhatLiesAudio)) && (
                            <a
                              className="cabin-track-action"
                              href={item.src}
                              download
                              onClick={() => {
                                trackMetric('soundtrack_download', { track: item.title });
                                if (item.whatLiesAudio) {
                                  trackMetric('what_lies_audio_download', { source: 'gramophone' });
                                }
                              }}
                            >
                              Download
                            </a>
                          )}
                        </span>
                      </div>
                    ) : item.whatLiesAudio ? (
                      <div className="cabin-track-row cabin-track-row--preview">
                        <span>{item.title}</span>
                        <span className="cabin-track-actions">
                          <button
                            className="cabin-track-action"
                            type="button"
                            onClick={() => {
                              trackMetric('what_lies_audio_preview_play', { source: 'gramophone' });
                              playLandPreview(item.src, WHAT_LIES_IN_THE_FOG_PREVIEW_END);
                            }}
                          >
                            Play preview
                          </button>
                          <button
                            className="cabin-track-action"
                            type="button"
                            onClick={() => {
                              trackMetric('what_lies_audio_recover_open', { source: 'gramophone' });
                              const offer = DISCOVERED_ITEMS.find((entry) => entry.id === 'entry1');
                              setPanel('archive');
                              if (offer) showArchiveDetail(offer);
                            }}
                          >
                            Acquire full audio
                          </button>
                        </span>
                      </div>
                    ) : (
                      <div className="cabin-track-row cabin-track-row--locked">
                        <span className="cabin-track cabin-track--locked">{item.title}</span>
                        {item.premium && item.purchasable ? (
                          <button
                            className="cabin-track-action"
                            type="button"
                            onClick={handleSoundtrackPurchase}
                            disabled={soundtrackPurchaseStatus === 'submitting'}
                          >
                            {soundtrackPurchaseStatus === 'submitting' ? 'Opening' : 'Purchase'}
                          </button>
                        ) : (
                          <small className="cabin-track-lock" aria-label="Locked">🔒</small>
                        )}
                      </div>
                    )}
                    </li>
                  );
                })}
              </ul>
              {soundtrackPurchaseMessage && (
                <p className={`cabin-archive-email-status is-${soundtrackPurchaseStatus}`}>
                  {soundtrackPurchaseMessage}
                </p>
              )}
            </>
          )}

          {panel === 'lore' && (
            <>
              <h2>18:21</h2>
              <p>The hands refuse to move past the hour the fog first answered back.</p>
            </>
          )}
        </div>
      )}

      {checkoutPanel && (
        <EmbeddedCheckoutPanel
          itemName={checkoutPanel.itemName}
          clientSecret={checkoutPanel.clientSecret}
          error={checkoutPanel.error}
          onClose={() => {
            if (checkoutPanel.artifactId === 'soundtrack-bundle') {
              setSoundtrackPurchaseStatus('idle');
            }
            setCheckoutPanel(null);
          }}
        />
      )}

      {journalPrototypeOpen && (
        <JournalPrototype
          isOwned={owns1821}
          onClose={() => setJournalPrototypeOpen(false)}
          onPlayWhatLies={() => {
            playLandPreview(WHAT_LIES_IN_THE_FOG_AUDIO, WHAT_LIES_IN_THE_FOG_PREVIEW_END);
          }}
          onRecoverWhatLies={() => {
            setJournalPrototypeOpen(false);
            setActiveHotspot('gramophone');
            setPanel('soundtrack');
          }}
          onPurchase={() => {
            if (owns1821) {
              window.open(featuredArchiveItem.href, '_blank', 'noopener,noreferrer');
            } else {
              setJournalPrototypeOpen(false);
              handleArchivePurchase(featuredArchiveItem);
            }
          }}
        />
      )}

      <div className="cabin-fade" aria-hidden="true" />
    </section>
  );
}

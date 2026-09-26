'use client';

import { useEffect, useRef } from 'react';

interface BrandVoiceProps {
  enabled?: boolean;
}

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * Delay fix:
 *  - The page renders a <link rel="preload" as="audio"> so the browser
 *    downloads the file at highest priority during HTML parsing.
 *  - We wait for the `canplaythrough` event before attempting play —
 *    guaranteeing the audio is fully buffered and ready (zero delay).
 *  - Falls back immediately if the file is already cached (readyState ≥ 3).
 *
 * Autoplay strategies (in order):
 *  1. Direct unmuted play.
 *  2. Muted play → instant unmute (Chrome/Safari trick).
 *  3. First user interaction (scroll/click/touch/mousemove).
 */
export default function BrandVoice({ enabled = true }: BrandVoiceProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAttempted = useRef(false);
  const played = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 1;
    audio.muted = false;

    /* ── interaction fallback listeners ─────────────────────────── */
    const removeListeners = () => {
      window.removeEventListener('click',       onInteraction);
      window.removeEventListener('scroll',      onInteraction);
      window.removeEventListener('keydown',     onInteraction);
      window.removeEventListener('touchstart',  onInteraction);
      window.removeEventListener('touchend',    onInteraction);
      window.removeEventListener('mousemove',   onInteraction);
      window.removeEventListener('pointerdown', onInteraction);
    };

    const onInteraction = () => {
      if (played.current) return;
      played.current = true;
      removeListeners();
      audio.muted = false;
      audio.volume = 1;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    const listenForInteraction = () => {
      const opts = { once: true, passive: true } as const;
      window.addEventListener('click',       onInteraction, opts);
      window.addEventListener('scroll',      onInteraction, opts);
      window.addEventListener('keydown',     onInteraction, opts);
      window.addEventListener('touchstart',  onInteraction, opts);
      window.addEventListener('touchend',    onInteraction, opts);
      window.addEventListener('mousemove',   onInteraction, opts);
      window.addEventListener('pointerdown', onInteraction, opts);
    };

    /* ── core play logic (called once audio is buffered & ready) ── */
    const attemptPlay = () => {
      // Strategy 1: direct unmuted play
      audio.play()
        .then(() => { played.current = true; })
        .catch(() => {
          // Strategy 2: muted → instant unmute
          audio.muted = true;
          audio.play()
            .then(() => {
              audio.muted = false;
              audio.volume = 1;
              played.current = true;
            })
            .catch(() => {
              // Strategy 3: wait for user interaction
              audio.muted = false;
              listenForInteraction();
            });
        });
    };

    /* ── wait for audio to be ready (no buffering delay) ─────────── */
    // HAVE_ENOUGH_DATA (readyState 4) or HAVE_FUTURE_DATA (3) = ready now
    if (audio.readyState >= 3) {
      attemptPlay();
    } else {
      const onReady = () => {
        audio.removeEventListener('canplaythrough', onReady);
        attemptPlay();
      };
      audio.addEventListener('canplaythrough', onReady);
    }

    return () => {
      removeListeners();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      ref={audioRef}
      src="/audio/sth-gadgets-voice.mp3"
      preload="auto"
      playsInline
      aria-hidden="true"
      style={{ display: 'none' }}
    />
  );
}

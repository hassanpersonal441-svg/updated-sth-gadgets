'use client';

import { useEffect, useRef } from 'react';

interface BrandVoiceProps {
  enabled?: boolean;
}

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * How it works:
 *  - Renders a hidden <audio> element (display:none, aria-hidden, no controls).
 *  - On mount: tries unmuted play → if blocked, tries muted play → unmutes
 *    immediately after (Chrome/Safari trick) → if still blocked, waits for
 *    first user interaction (click/scroll/touch/mousemove) then plays.
 *  - If `enabled` prop is false, does nothing.
 *  - Plays on every home page refresh.
 *  - React re-renders never cause a double-play.
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

    const removeListeners = () => {
      window.removeEventListener('click',     onInteraction);
      window.removeEventListener('scroll',    onInteraction);
      window.removeEventListener('keydown',   onInteraction);
      window.removeEventListener('touchstart',onInteraction);
      window.removeEventListener('touchend',  onInteraction);
      window.removeEventListener('mousemove', onInteraction);
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
      window.addEventListener('click',      onInteraction, opts);
      window.addEventListener('scroll',     onInteraction, opts);
      window.addEventListener('keydown',    onInteraction, opts);
      window.addEventListener('touchstart', onInteraction, opts);
      window.addEventListener('touchend',   onInteraction, opts);
      window.addEventListener('mousemove',  onInteraction, opts);
      window.addEventListener('pointerdown',onInteraction, opts);
    };

    // Strategy 1: Direct unmuted play
    audio.play()
      .then(() => {
        played.current = true;
      })
      .catch(() => {
        // Strategy 2: Muted autoplay → unmute immediately
        audio.muted = true;
        audio.play()
          .then(() => {
            // Muted play succeeded — unmute right away
            audio.muted = false;
            audio.volume = 1;
            played.current = true;
          })
          .catch(() => {
            // Strategy 3: Full block — wait for ANY user interaction
            audio.muted = false;
            listenForInteraction();
          });
      });

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

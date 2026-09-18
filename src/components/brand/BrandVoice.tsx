'use client';

import { useEffect, useRef } from 'react';

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * Multi-strategy autoplay handling:
 *  1. Try direct unmuted play (works if browser allows it).
 *  2. Try muted autoplay → unmute on first user interaction (Chrome trick).
 *  3. Wait for first user interaction (click/scroll/touch/key) → play unmuted.
 *  Renders zero UI. Plays every home page refresh.
 */
export default function BrandVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAttempted = useRef(false);
  const played = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const audio = new Audio('/audio/sth-gadgets-voice.mp3');
    audio.preload = 'auto';
    audio.volume = 1;
    audioRef.current = audio;

    const removeListeners = () => {
      window.removeEventListener('click',      onInteraction);
      window.removeEventListener('scroll',     onInteraction);
      window.removeEventListener('keydown',    onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      window.removeEventListener('touchend',   onInteraction);
      window.removeEventListener('mousemove',  onInteraction);
    };

    const onInteraction = () => {
      if (played.current) return;
      played.current = true;
      removeListeners();
      audio.muted = false;
      audio.volume = 1;
      audio.play().catch(() => {});
    };

    const attachInteractionListeners = () => {
      const opts = { once: true, passive: true } as const;
      window.addEventListener('click',      onInteraction, opts);
      window.addEventListener('scroll',     onInteraction, opts);
      window.addEventListener('keydown',    onInteraction, opts);
      window.addEventListener('touchstart', onInteraction, opts);
      window.addEventListener('touchend',   onInteraction, opts);
      window.addEventListener('mousemove',  onInteraction, opts);
    };

    // Strategy 1: Direct unmuted autoplay
    audio.play()
      .then(() => {
        played.current = true; // success — nothing else needed
      })
      .catch(() => {
        // Strategy 2: Muted autoplay (browsers allow this more often)
        audio.muted = true;
        audio.play()
          .then(() => {
            // Muted play started — unmute on first interaction
            attachInteractionListeners();
          })
          .catch(() => {
            // Strategy 3: Both blocked — wait for interaction then play unmuted
            audio.muted = false;
            attachInteractionListeners();
          });
      });

    return () => {
      removeListeners();
      audio.pause();
      audio.src = '';
    };
  }, []);

  return null;
}


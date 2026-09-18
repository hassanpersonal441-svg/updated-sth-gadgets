'use client';

import { useEffect, useRef } from 'react';

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * Strategy:
 *  1. Preload the audio immediately so it's ready to play.
 *  2. Try direct autoplay (works if browser/OS allows it).
 *  3. If autoplay is blocked (most browsers), silently attach a ONE-TIME
 *     listener to the first user interaction (click / scroll / keydown / touchstart)
 *     and play at that moment — still invisible, no UI, feels instant.
 *  4. Plays on every home page refresh.
 *  5. React re-renders never cause a double-play.
 */
export default function BrandVoice() {
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const audio = new Audio('/audio/sth-gadgets-voice.mp3');
    audio.preload = 'auto';
    audio.volume = 1;

    let played = false;

    const playOnce = () => {
      if (played) return;
      played = true;
      removeListeners();
      audio.play().catch(() => {/* still silent */});
    };

    const removeListeners = () => {
      window.removeEventListener('click',      playOnce);
      window.removeEventListener('scroll',     playOnce);
      window.removeEventListener('keydown',    playOnce);
      window.removeEventListener('touchstart', playOnce);
    };

    // 1. Try direct autoplay first
    audio.play().then(() => {
      played = true; // autoplay succeeded — no need for interaction listeners
    }).catch(() => {
      // 2. Autoplay blocked — wait for first user interaction
      window.addEventListener('click',      playOnce, { once: true, passive: true });
      window.addEventListener('scroll',     playOnce, { once: true, passive: true });
      window.addEventListener('keydown',    playOnce, { once: true, passive: true });
      window.addEventListener('touchstart', playOnce, { once: true, passive: true });
    });

    return () => {
      removeListeners();
      audio.pause();
      audio.src = '';
    };
  }, []);

  return null;
}


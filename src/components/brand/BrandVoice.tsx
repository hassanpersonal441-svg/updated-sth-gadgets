'use client';

import { useEffect, useRef } from 'react';

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * Rules:
 *  - Plays /audio/sth-gadgets-voice.mp3 on every home page load / refresh.
 *  - Renders absolutely no UI (returns null).
 *  - Silently respects browser autoplay restrictions.
 *  - Never restarts on React re-renders or route state changes.
 */
export default function BrandVoice() {
  const hasAttempted = useRef(false);

  useEffect(() => {
    // Guard: run only once per mount — prevents double-play on React re-renders.
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const audio = new Audio('/audio/sth-gadgets-voice.mp3');
    audio.preload = 'auto';
    audio.volume = 1;

    audio
      .play()
      .catch(() => {
        // Browser blocked autoplay — fail silently, no UI shown.
      });

    return () => {
      // Cleanup: stop audio if component unmounts mid-playback.
      audio.pause();
      audio.src = '';
    };
  }, []); // Empty deps — intentionally runs only on first mount.

  return null;
}

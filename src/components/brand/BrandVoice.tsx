'use client';

import { useEffect, useRef } from 'react';

const SESSION_KEY = 'sth_brand_voice_played';

/**
 * BrandVoice — invisible, home-page-only brand audio experience.
 *
 * Rules:
 *  - Plays /audio/sth-gadgets-voice.mp3 once per browser session.
 *  - Renders absolutely no UI (returns null).
 *  - Silently respects browser autoplay restrictions.
 *  - Never restarts on React re-renders or route state changes.
 */
export default function BrandVoice() {
  const hasAttempted = useRef(false);

  useEffect(() => {
    // Guard: run only once per component mount, and only once per session.
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
        return; // Already played this session — stay silent.
      }
    } catch {
      // sessionStorage might be blocked (private browsing edge cases) — ignore.
    }

    const audio = new Audio('/audio/sth-gadgets-voice.mp3');
    audio.preload = 'auto';
    audio.volume = 1;

    audio
      .play()
      .then(() => {
        // Playback started — mark session so it doesn't replay on revisit.
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          // Ignore storage errors.
        }
      })
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

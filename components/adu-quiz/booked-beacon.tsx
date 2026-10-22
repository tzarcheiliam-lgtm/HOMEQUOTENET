'use client';

import { useEffect } from 'react';

/** Tells the quiz page (parent window, same origin) that the booking finished. */
export function BookedBeacon() {
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: 'adu-quiz-booked' }, window.location.origin);
  }, []);
  return null;
}

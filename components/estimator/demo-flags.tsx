'use client';

import { useEffect } from 'react';
import { syncDemoFinancing } from '@/lib/estimator/demo-financing';

/**
 * Remembers ?demo=financing (or clears it with ?demo=off) for the tab on any
 * estimator page, so the flag set on the landing page still holds after the
 * plain links to /design and through the contact step. Renders nothing.
 */
export function DemoFlagCapture() {
  useEffect(() => {
    syncDemoFinancing(window.location.search);
  }, []);
  return null;
}

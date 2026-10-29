'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ADDRESS_MAX,
  AUTOCOMPLETE_MIN,
  fetchAddressDetails,
  fetchAddressSuggestions,
  newSessionToken,
  type AddressPlace,
  type AddressSuggestion,
} from '@/lib/estimator/address-client';

/**
 * The contact step's "Home address" field with Google address suggestions
 * (Buildoly's dropdown: white, 1px #d0d0d0, 8px radius, 48px rows) through our
 * own proxy routes, so the key never reaches the browser. ARIA combobox +
 * listbox: arrows move, Return picks, Escape / leaving the field closes.
 * Picking a suggestion fills the full formatted address and keeps the place
 * (ZIP, city, state, lat/lng); typing again drops it (the typed ZIP then counts).
 *
 * Without a key on the server (preview, local) the first request answers
 * 'disabled' and this is a plain address input from then on: iOS / browser
 * autofill (autocomplete="street-address") still works. The list overlays the
 * page (no layout shift) and, on a phone, the field scrolls to the top when
 * focused so the keyboard never covers the list.
 */

const DEBOUNCE_MS = 200;
/** The routes said there is nothing to ask (no key / blocked / over the limit): stop asking for this page view. */
const STOP = new Set(['disabled', 'forbidden', 'not_found', 'limit']);

export type AddressFieldProps = {
  slug: string;
  id: string;
  label: string;
  value: string;
  /** Typed text (place null) or a picked place's full address (place set). */
  onChange: (value: string, place: AddressPlace | null) => void;
  onBlur?: () => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  describedBy?: string;
  className: string;
  enterKeyHint?: 'go' | 'next' | 'done';
  labelClassName: string;
};

export function AddressField({ slug, id, label, value, onChange, onBlur, onKeyDown, invalid, describedBy, className, enterKeyHint = 'next', labelClassName }: AddressFieldProps) {
  const listId = `${id}-list`;
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [off, setOff] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useRef<string | null>(null);
  const seq = useRef(0);
  const abort = useRef<AbortController | null>(null);
  // Only typing asks Google; a picked address (or a restored draft) does not.
  const typed = useRef(false);
  const focused = useRef(false);
  // A pick is being resolved: leaving the field now must not flag the half-filled text.
  const resolving = useRef(false);
  const blurTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (off || !typed.current) return;
    const input = value.trim();
    if (input.length < AUTOCOMPLETE_MIN) {
      abort.current?.abort();
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const t = window.setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const n = ++seq.current;
      token.current ??= newSessionToken();
      const res = await fetchAddressSuggestions(slug, input, token.current, { signal: controller.signal });
      if (n !== seq.current) return;
      if (!res.ok) {
        if (STOP.has(res.reason)) setOff(true);
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setSuggestions(res.suggestions);
      setActive(-1);
      setOpen(focused.current && typed.current && res.suggestions.length > 0);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value, slug, off]);

  useEffect(
    () => () => {
      abort.current?.abort();
      window.clearTimeout(blurTimer.current);
    },
    [],
  );

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = async (s: AddressSuggestion) => {
    const shown = [s.main, s.secondary].filter(Boolean).join(', ').slice(0, ADDRESS_MAX);
    typed.current = false;
    seq.current++;
    abort.current?.abort();
    close();
    setSuggestions([]);
    onChange(shown, null);
    const session = token.current ?? newSessionToken();
    // The pick ends this billing session; the next search starts a new one.
    token.current = null;
    resolving.current = true;
    const res = await fetchAddressDetails(slug, s.placeId, session);
    resolving.current = false;
    // Only if the field still shows what we filled in (they may have kept typing).
    if (!res.ok || inputRef.current?.value !== shown) {
      if (!focused.current) onBlur?.();
      return;
    }
    const place: AddressPlace = { address: res.address, zip: res.zip, city: res.city, state: res.state, lat: res.lat, lng: res.lng };
    onChange(res.address, place);
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        void pick(suggestions[active]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
    } else if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive(0);
      return;
    }
    onKeyDown?.(e);
  };

  const showList = open && !off && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        data-field="address"
        data-text=""
        name="address"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="street-address"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        maxLength={ADDRESS_MAX}
        placeholder=" "
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value, null);
        }}
        onFocus={(e) => {
          focused.current = true;
          window.clearTimeout(blurTimer.current);
          // Never reopen old suggestions on focus (e.g. focus moved here by an error): the next keystroke asks again.
          // Phones: lift the field to the top so the keyboard never covers the list.
          const el = e.currentTarget;
          try {
            if (window.matchMedia('(pointer: coarse)').matches) {
              window.setTimeout(() => el.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 300);
            }
          } catch {
            /* old browsers: no scroll */
          }
        }}
        onBlur={() => {
          focused.current = false;
          // Leaving the field drops any search still on its way (it must not pop open later).
          typed.current = false;
          seq.current++;
          abort.current?.abort();
          // A short delay: a tap on a suggestion that still blurred the field (some touch browsers) lands first.
          window.clearTimeout(blurTimer.current);
          blurTimer.current = window.setTimeout(() => {
            if (focused.current) return;
            close();
            setSuggestions([]);
            if (!resolving.current) onBlur?.();
          }, 120);
        }}
        onKeyDown={onKey}
        className={`${className} scroll-mt-3`}
      />
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div
        className={showList ? 'absolute inset-x-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[8px] border border-[#d0d0d0] bg-white shadow-[0_8px_24px_rgb(0_0_0/0.12)]' : 'hidden'}
        data-address-list=""
      >
        <ul id={listId} role="listbox" aria-label="Address suggestions">
          {showList
            ? suggestions.map((s, i) => (
                <li
                  key={s.placeId}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // Keep the focus in the field (no blur before the pick), for mouse and touch alike.
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pick(s)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex h-12 cursor-pointer touch-manipulation flex-col justify-center border-b border-[#ececec] px-[15px] last:border-b-0 ${i === active ? 'bg-[#f2f4f7]' : 'bg-white'}`}
                >
                  <span className="truncate text-[15px] leading-[19px] text-[var(--fn-ink)]">{s.main}</span>
                  {s.secondary ? <span className="truncate text-[13px] leading-[17px] text-[var(--fn-muted)]">{s.secondary}</span> : null}
                </li>
              ))
            : null}
        </ul>
        {showList ? (
          <p className="border-t border-[#ececec] px-[15px] py-1.5 text-right text-[11px] leading-[14px] text-[var(--fn-muted)]" aria-hidden="true">
            Powered by Google
          </p>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {showList ? `${suggestions.length} address${suggestions.length === 1 ? '' : 'es'} found. Use the arrow keys to choose.` : ''}
      </p>
    </div>
  );
}

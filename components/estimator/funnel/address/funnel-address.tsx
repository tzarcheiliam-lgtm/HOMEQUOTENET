'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { AddressPlace } from '@/lib/estimator/address-client';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';
import { DEFAULT_HOME_BAND, HOME_BANDS, type HomeBand } from '@/lib/estimator/roofing/pricing-config';
import { fetchRoof, pitchRise } from '@/lib/estimator/roofing/roof';
import { AddressField } from '../contact/address-field';
import { prefillContactAddress } from '../contact/state';
import { StepPhoto } from '../step-photo';
import { resolvePhoto } from '../state';
import { readRoofState, roofFacts, writeRoofState, type RoofState } from './state';

/**
 * The roofing funnel's first screen (FunnelSpec.addressFirst, "STEP 1"):
 * "Where's your home?" with the Google address field. Picking a suggestion
 * asks the server to measure the roof from above (Google Solar API, via the
 * address details route); then "We found your roof." with Google's satellite
 * photo, unmodified (its own logo and attribution are in the image), and the
 * roof in numbers. When the roof cannot be measured (no coverage, no key, a
 * typed address with no Google pick) the three home-size bands are asked
 * instead. Continue keeps the roof (sessionStorage, ./state.ts), fills the
 * contact step's address and opens the first design step.
 *
 * Draws only its content column (the shell draws the bar and the gutters).
 */
export function FunnelAddressScreen({
  slug,
  spec,
  missing,
  headingId,
  onContinue,
  onRoofChange,
}: {
  slug: string;
  spec: FunnelSpec;
  missing: ReadonlySet<string>;
  headingId: string;
  onContinue: () => void;
  /** The roof changed (another address): a lead result priced for the old one no longer applies. */
  onRoofChange: () => void;
}) {
  const uid = useId();
  const step = spec.addressFirst!;
  const [address, setAddress] = useState('');
  const [place, setPlace] = useState<AddressPlace | null>(null);
  const [roof, setRoof] = useState<RoofState | null>(null);
  const [band, setBand] = useState<HomeBand>(DEFAULT_HOME_BAND);
  const [measuring, setMeasuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // Restore after mount (no hydration mismatch).
  useEffect(() => {
    const stored = readRoofState(slug);
    if (!stored) return;
    setAddress(stored.address);
    setPlace(stored.place);
    setRoof(stored);
    setBand(stored.band);
  }, [slug]);

  const remember = (next: RoofState | null) => {
    setRoof(next);
    writeRoofState(slug, next);
    onRoofChange();
  };

  const measure = async (text: string, picked: AddressPlace) => {
    if (picked.lat === null || picked.lng === null) {
      remember({ v: 1, address: text, place: picked, status: 'band', band });
      return;
    }
    const n = ++seq.current;
    setMeasuring(true);
    setError(null);
    const res = await fetchRoof(slug, picked.lat, picked.lng);
    if (n !== seq.current) return;
    setMeasuring(false);
    if (res.ok) remember({ v: 1, address: text, place: picked, status: 'found', measure: res.measure, mapUrl: res.mapUrl, band });
    else if (res.reason === 'limit') setError('Too many tries for now. Pick your home size below and we’ll keep going.');
    if (!res.ok) remember({ v: 1, address: text, place: picked, status: 'band', band });
  };

  const onAddress = (value: string, picked: AddressPlace | null) => {
    setAddress(value);
    setPlace(picked);
    setError(null);
    if (picked) void measure(value, picked);
    else if (roof) {
      // Typing again: the old roof no longer matches the text.
      seq.current++;
      setMeasuring(false);
      remember(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (measuring) return;
    const text = address.trim();
    if (!text) {
      setError('Enter your home address.');
      document.getElementById(`${uid}-address`)?.focus();
      return;
    }
    if (!roof) {
      // A typed address without a Google pick: no coordinates to measure, so the bands are asked.
      remember({ v: 1, address: text, place: null, status: 'band', band });
      return;
    }
    const kept: RoofState = { ...roof, band };
    writeRoofState(slug, kept);
    prefillContactAddress(slug, kept.address, kept.place);
    onContinue();
  };

  const found = roof?.status === 'found' && roof.measure ? roof : null;
  const asking = roof?.status === 'band';
  const house = resolvePhoto(step.photo, missing);
  const fieldClass =
    'peer block h-14 w-full rounded-[8px] border bg-white px-[15px] pb-[7px] pt-[23px] text-[16px] leading-[22px] text-[var(--fn-ink)] outline-none transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none border-[var(--fn-line)] focus:border-[var(--fn-blue)] focus:shadow-[0_0_0_1px_var(--fn-blue)]';
  const labelClass =
    'pointer-events-none absolute left-[16px] top-[17px] origin-left text-[16px] leading-[22px] text-[var(--fn-muted)] transition-transform duration-150 ease-out peer-focus:-translate-y-[10px] peer-focus:scale-[0.75] peer-[:not(:placeholder-shown)]:-translate-y-[10px] peer-[:not(:placeholder-shown)]:scale-[0.75] motion-reduce:transition-none';

  return (
    <form onSubmit={submit} noValidate data-funnel-address="">
      <div className="pt-[19px] lg:pt-7">
        {found?.mapUrl ? (
          // Google's satellite photo exactly as Google serves it (logo and attribution inside), whole, on white.
          <div className="fn-photo relative w-full overflow-hidden rounded-[12px] bg-white" data-funnel-satellite="">
            {/* eslint-disable-next-line @next/next/no-img-element -- Google Maps Static API image, shown unmodified */}
            <img src={found.mapUrl} alt="Satellite view of your home from above (Google)" className="absolute inset-0 h-full w-full object-contain" referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        ) : (
          <StepPhoto photos={[['house', house]]} selected="house" frame={{ fit: 'contain', zoom: 1, backdrop: 'blur' }} priority />
        )}
      </div>

      <h1 id={headingId} tabIndex={-1} className="fn-h1 mt-[18px] text-balance outline-none lg:mt-7">
        {found ? step.foundLabel : asking ? step.bandLabel : step.label}
        {found ? (
          <span className="block text-pretty text-[var(--fn-muted-strong)]" data-funnel-roof-facts="">
            {roofFacts(found.measure!, pitchRise(found.measure!.pitchDeg))}
          </span>
        ) : asking ? null : (
          <span className="block text-pretty text-[var(--fn-muted-strong)]">{step.subline}</span>
        )}
      </h1>

      <div className="mt-5 lg:mt-6">
        <div className="relative">
          <AddressField
            slug={slug}
            id={`${uid}-address`}
            label="Home address"
            value={address}
            onChange={onAddress}
            invalid={!!error && !address.trim()}
            describedBy={error ? `${uid}-error` : undefined}
            enterKeyHint="go"
            className={fieldClass}
            labelClassName={labelClass}
          />
        </div>
      </div>

      {asking ? (
        <fieldset className="mt-4">
          <legend className="text-[15px] leading-5 text-[var(--fn-text)]">{step.notFoundText}</legend>
          <div className="mt-3 flex flex-col gap-3">
            {HOME_BANDS.map((b) => (
              <label key={b.id} className="fn-option px-[15px] py-[10px] lg:px-5 lg:py-[14px]" data-selected={band === b.id ? '' : undefined}>
                <input type="radio" name={`${uid}-band`} value={b.id} checked={band === b.id} onChange={() => setBand(b.id)} className="sr-only" />
                <span className="block text-[17px] font-[480] leading-[22px] tracking-[-0.01em] text-[var(--fn-ink)] lg:text-[18px] lg:leading-[24px]">{b.title}</span>
                <span className="mt-[3px] block text-pretty text-[15px] leading-[20px] text-[var(--fn-muted)] lg:text-[16px] lg:leading-[22px]">{b.subtitle}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <p id={`${uid}-error`} role="alert" className="mt-2 text-[13.5px] font-medium leading-[18px] text-[#c4281c] empty:hidden">
        {error}
      </p>

      <button type="submit" disabled={measuring} aria-busy={measuring || undefined} className="fn-btn mt-[13px] h-[47px] w-full gap-2 text-[17px] disabled:cursor-wait lg:mt-4 lg:h-[52px] lg:text-[18px]">
        {measuring ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin motion-reduce:animate-none" /> : null}
        {measuring ? 'Finding your roof…' : roof ? 'Continue' : step.cta}
      </button>
    </form>
  );
}

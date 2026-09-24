'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, LockKeyhole, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { consentText, contactSchema, visibleQuestions, type FunnelConfig, type Session } from '@/lib/funnels/schema';
import { trackFunnel } from '@/lib/funnels/tracking';

export function FunnelExperience({ slug, initialConfig, demo }: { slug: string; initialConfig: FunnelConfig; demo: boolean }) {
  const [config, setConfig] = useState(initialConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zip, setZip] = useState('');
  const [checking, setChecking] = useState(true);
  const [tracking, setTracking] = useState(false);
  const initialized = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const endpoint = `/api/funnels/${slug}/session`;

  const start = useCallback(async () => {
    setError(''); setBusy(true);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        url: location.href, referrer: document.referrer, device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop',
      }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setConfig(data.config); setSession(data.session);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }, [endpoint]);
  useEffect(() => { if (!initialized.current) { initialized.current = true; void start(); } }, [start]);

  const save = useCallback(async (body: Record<string, unknown>) => {
    if (!session || busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, version: session.version }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setSession(data.session);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }, [session, busy, endpoint]);

  const step = session?.current_step ?? config.questions[0].id;
  const questions = visibleQuestions(config, session?.answers ?? {});
  const index = questions.findIndex(q => q.id === step);
  const question = questions[index];
  const total = questions.length + 2 + (config.calendarUrl ? 1 : 0);
  const current = index >= 0 ? index + 1 : step === 'qualification' ? questions.length + 1 : step === 'contact' ? questions.length + 2 : total;
  useEffect(() => {
    setZip(session?.answers[step] ?? '');
    heading.current?.focus({ preventScroll: true });
    if (step === 'qualification') { setChecking(true); const timer = setTimeout(() => setChecking(false), 700); return () => clearTimeout(timer); }
  // Focus only when the screen changes; never disrupt typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => {
    if (!session?.id) return;
    try { setTracking(localStorage.getItem(`hqn-measurement:${session.id}`) === 'yes'); } catch { /* Measurement remains off. */ }
  }, [session?.id]);
  useEffect(() => {
    if (!session || !tracking || demo) return;
    trackFunnel(session.id, slug, 'ViewContent', config.trackingPixels.metaPixelId);
    if (session.contact_submitted_at) trackFunnel(session.id, slug, 'Lead', config.trackingPixels.metaPixelId);
    if (session.booked_at) trackFunnel(session.id, slug, 'Schedule', config.trackingPixels.metaPixelId);
  }, [session, tracking, config, slug, demo]);
  useEffect(() => {
    if (!session?.contact_submitted_at || !config.calendarUrl || step !== 'calendar') return;
    void fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: session.version, calendarViewed: true }) });
    const timer = setInterval(async () => {
      try { const res = await fetch(endpoint); if (res.ok) { const data = await res.json(); setSession(data.session); } } catch { /* A later poll retries. */ }
    }, 10000);
    return () => clearInterval(timer);
  }, [session?.contact_submitted_at, session?.version, config.calendarUrl, step, endpoint]);

  function back() {
    const previous = index > 0 ? questions[index - 1].id : step === 'contact' || step === 'qualification' ? questions.at(-1)!.id : null;
    if (previous) void save({ step: previous });
  }
  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contact = contactSchema.safeParse({ firstName: form.get('firstName'), lastName: form.get('lastName'), phone: form.get('phone'), email: form.get('email'), consent: form.get('consent') === 'on', website: form.get('website') });
    if (!contact.success) { setError(contact.error.issues[0].message); return; }
    void save({ contact: contact.data });
  }
  const done = !!session?.booked_at || step === 'thanks';
  const title = done ? session?.booked_at ? 'You’re on the calendar.' : config.thankYouPage.headline
    : step === 'calendar' ? 'Choose a time for your free estimate'
    : step === 'qualification' ? checking ? 'Checking availability in your area…' : session?.qualified ? config.qualifiedMessage : config.reviewMessage
    : step === 'contact' ? 'Who should we reach out to?' : question?.headline;
  const calendarUrl = config.calendarUrl ? new URL(config.calendarUrl) : null;
  if (calendarUrl && session) calendarUrl.searchParams.set('hqn_session_id', session.id);

  return <main className="hqn-funnel" style={{ '--funnel-primary': config.primaryColor, '--funnel-secondary': config.secondaryColor } as CSSProperties}>
    <div className="funnel-shell">
      <header className="funnel-header">
        <div className="funnel-brand">{config.clientLogo && <Image src={config.clientLogo} alt="" width={44} height={44} unoptimized />}<span>{config.clientName}<small>YOUR NEXT HOME PROJECT</small></span></div>
        <span className="funnel-secure"><LockKeyhole size={14} /> Private & secure</span>
      </header>
      {demo && <div className="funnel-demo">Interactive demo · No contractor is contacted and no appointment is booked.</div>}
      <div className="funnel-progress-copy"><span>{config.industry}</span><span>{done ? 'Complete' : `${current} of ${total}`}</span></div>
      <div className="funnel-progress" role="progressbar" aria-label="Your progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done ? total : current}><span style={{ width: `${(done ? 1 : current / total) * 100}%` }} /></div>
      <div className="funnel-toolbar">{session && !session.contact_submitted_at && (index > 0 || ['qualification', 'contact'].includes(step))
        ? <button onClick={back} disabled={busy} className="funnel-back"><ArrowLeft size={17} /> Back</button> : <span />}
        <span>About a minute. Built around you.</span></div>
      <section className="funnel-screen" key={step} aria-busy={busy}>
        <div className="funnel-eyebrow">{done ? <CheckCircle2 size={19} /> : step === 'qualification' ? <Sparkles size={19} /> : <ClipboardList size={19} />}<span>{done ? 'THANK YOU' : 'A LITTLE ABOUT YOUR PROJECT'}</span></div>
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {question?.description && <p className="funnel-description">{question.description}</p>}
        {!session && <p className="funnel-description" role="status">{busy ? 'Getting things ready…' : 'Let’s get started.'}</p>}
        {question?.type === 'choice' && <div className="funnel-answers">{question.options.map((option, i) => <button className="funnel-answer" key={option.value}
          disabled={!session || busy} aria-pressed={session?.answers[question.id] === option.value} onClick={() => void save({ answer: { question: question.id, value: option.value } })}>
          <span className="funnel-answer-number">{session?.answers[question.id] === option.value ? <Check size={17} /> : String(i + 1).padStart(2, '0')}</span>
          <span>{option.label}{option.detail && <small>{option.detail}</small>}</span><ArrowRight size={18} className="funnel-arrow" />
        </button>)}</div>}
        {question?.type === 'zip' && <form className="funnel-form" onSubmit={e => { e.preventDefault(); void save({ answer: { question: question.id, value: zip } }); }}>
          <Label htmlFor="project-zip">Project ZIP code</Label><div className="funnel-zip"><MapPin size={21} /><Input id="project-zip" name="zip" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={zip} onChange={e => { setZip(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="e.g. 91301" /></div>
          <Button className="funnel-primary" type="submit" disabled={busy || !session}>Check my project <ArrowRight size={18} /></Button>
        </form>}
        {step === 'qualification' && <div className="funnel-result">
          {checking ? <div className="funnel-checking" role="status"><span /> Reviewing your answers and {config.serviceArea.label}</div> : <>
            <p>{session?.qualified ? 'Share your details so we can help you take the next step. Availability will be confirmed by the team.' : 'Your project needs a personal review before we can confirm a fit.'}</p>
            {(session?.qualified || config.unqualifiedAction === 'review') && <Button className="funnel-primary" disabled={busy} onClick={() => void save({ step: 'contact' })}>Continue <ArrowRight size={18} /></Button>}
            {!session?.qualified && config.unqualifiedAction === 'stop' && <p>We’re unable to offer an estimate for these details right now. You can go back to correct an answer.</p>}
          </>}
        </div>}
        {step === 'contact' && <form className="funnel-form" onSubmit={submitContact} onChange={() => setError('')}>
          <p className="funnel-description">Your project, your pace. Let’s talk about what’s possible.</p>
          <div className="funnel-name-row"><div><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" autoComplete="given-name" maxLength={80} required /></div>
          <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" name="lastName" autoComplete="family-name" maxLength={80} required /></div></div>
          <div><Label htmlFor="phone">Phone number</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(555) 123-4567" required /></div>
          <div><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="funnel-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="funnel-consent"><input type="checkbox" name="consent" required /><span>{consentText(config)} <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a> · <a href="/terms" target="_blank" rel="noreferrer">Terms</a></span></label>
          <Button type="submit" className="funnel-primary" disabled={busy}>{busy ? 'Saving your request…' : demo ? 'Preview the next step' : session?.qualified && config.calendarUrl ? 'Choose my estimate time' : 'Request my free estimate'}<ArrowRight size={18} /></Button>
        </form>}
        {step === 'calendar' && !done && calendarUrl && <div className="funnel-calendar">
          <p className="funnel-description">Pick the day and time that works for you.</p>
          <iframe title={`Book an estimate with ${config.clientName}`} src={calendarUrl.toString()} referrerPolicy="strict-origin-when-cross-origin" allow="payment" />
          <p>Booking confirmation will appear here after the calendar confirms your appointment. If no times work, the team has your request and can follow up.</p>
        </div>}
        {done && <div className="funnel-result"><div className="funnel-success"><CheckCircle2 size={36} /></div><p>{demo ? 'You’ve completed the demo. In a published client funnel, these details reach HomeQuote and the connected CRM.' : session?.booked_at ? 'Your appointment has been confirmed. Please check your calendar confirmation for the details.' : config.thankYouPage.message}</p></div>}
        {error && <div className="funnel-error" role="alert">{error}{!session && <button onClick={() => void start()} disabled={busy}>Try again</button>}</div>}
        {busy && session && <span className="sr-only" role="status">Saving your progress</span>}
      </section>
      <footer className="funnel-footer"><div><ShieldCheck size={16} /><span>Your details stay with the team helping with your project.</span></div>
        {config.trust.license && <p>License: {config.trust.license}</p>}
        {config.trust.rating && config.trust.reviewCount && <p>{config.trust.rating}/5 Google rating · {config.trust.reviewCount} reviews</p>}
        {config.trust.yearsInBusiness && <p>{config.trust.yearsInBusiness} years in business</p>}
        {config.trust.financing && <p>{config.trust.financing}</p>}{config.trust.warranty && <p>{config.trust.warranty}</p>}
        {config.trust.testimonial && <blockquote>{config.trust.testimonial}</blockquote>}
        {config.trust.projectPhoto && <Image src={config.trust.projectPhoto} alt="Contractor project" width={480} height={280} unoptimized className="funnel-trust-photo" />}
        <p>Powered by <strong>HomeQuote Network</strong></p>
        {config.trackingPixels.metaPixelId && !demo && <label className="funnel-tracking"><input type="checkbox" checked={tracking} onChange={e => {
          setTracking(e.target.checked);
          try { if (session) localStorage.setItem(`hqn-measurement:${session.id}`, e.target.checked ? 'yes' : 'no'); } catch { /* Optional storage. */ }
        }} /> Allow optional advertising measurement</label>}
      </footer>
    </div>
  </main>;
}

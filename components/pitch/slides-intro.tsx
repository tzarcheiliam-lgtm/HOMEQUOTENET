'use client';

import { motion } from 'motion/react';
import {
  CalendarCheck,
  CalendarDays,
  CircleSlash,
  Filter,
  Handshake,
  LayoutTemplate,
  Megaphone,
  MessageSquareText,
  PhoneMissed,
  Search,
  TrendingDown,
  UserPlus,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { PLATFORM_FEATURES } from '@/lib/pitch/config';
import { cn } from '@/lib/utils';
import { FinePrint, Heading, Lead, Slide } from './kit';

const EASE = [0.22, 1, 0.36, 1] as const;

// ---------------------------------------------------------------------------------------------
// 1. Opening
// ---------------------------------------------------------------------------------------------

export function IntroSlide() {
  return (
    <Slide tone="navy" logo={false} bleed>
      {/* The photo fills the right side and melts into navy on the left. */}
      <div className="absolute inset-y-0 right-0 w-[980px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/general-contractors/modern-home-exterior-dusk.webp" alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--pd-navy)] via-[var(--pd-navy)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--pd-navy)]/70 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-[104px] pb-[96px] pt-[80px]">
        <BrandLogo tone="reversed" className="h-[46px] w-auto self-start" priority />
        <div className="mt-auto max-w-[820px]">
          <h1 className="pd-display text-white">Your next customer is already looking.</h1>
          <p className="pd-lead mt-8 max-w-[680px]">
            We help home improvement contractors turn homeowner interest into qualified sales appointments.
          </p>
        </div>
      </div>

      {/* The one moment on load: an appointment lands on the calendar. */}
      <motion.div
        className="absolute right-[96px] top-[300px] z-10 w-[400px] rounded-2xl bg-white p-6 text-[var(--pd-navy)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--pd-blue)] text-white">
            <CalendarCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Estimate booked</p>
            <p className="text-[14px] text-[var(--pd-slate)]">Kitchen remodel · Thursday, 10:00 AM</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-y-3 border-t border-[var(--pd-line)] pt-4 text-[14px]">
          <dt className="text-[var(--pd-slate)]">Homeowner</dt>
          <dd className="text-right font-medium">Confirmed</dd>
          <dt className="text-[var(--pd-slate)]">Decision makers</dt>
          <dd className="text-right font-medium">Both attending</dd>
          <dt className="text-[var(--pd-slate)]">Reminder</dt>
          <dd className="text-right font-medium">Sent the day before</dd>
        </dl>
        <p className="mt-4 text-[12px] text-[var(--pd-slate)]">Illustration of a booked appointment in HomeQuote</p>
      </motion.div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. The problem
// ---------------------------------------------------------------------------------------------

const LEAKS = [
  { icon: TrendingDown, title: 'Inconsistent lead flow', line: 'A busy month, then nothing.' },
  { icon: PhoneMissed, title: 'Missed calls, slow follow-up', line: 'The homeowner calls the next contractor.' },
  { icon: CircleSlash, title: 'Homeowners who never answer', line: 'Three calls, two texts, no reply.' },
  { icon: Search, title: 'Chasing poor fits', line: 'Hours spent on people who were never buying.' },
  { icon: Users, title: 'Agencies that stop at leads', line: 'A list of names is not an estimate on the calendar.' },
];

export function ProblemSlide() {
  return (
    <Slide tone="light">
      <Heading className="max-w-[1250px]">You’re not losing jobs because you’re bad at construction.</Heading>
      <p className="pd-h3 mt-6 max-w-[1100px] text-[34px] font-semibold leading-tight text-[var(--pd-blue)]">
        You’re losing opportunities before you ever get to the estimate.
      </p>

      {/* A broken pipe: each gap is where a homeowner slips away. */}
      <div className="my-auto pt-6">
        <div className="relative mb-12 flex h-[6px] gap-6" aria-hidden="true">
          {LEAKS.map((l) => (
            <span key={l.title} className="flex-1 rounded-full bg-[var(--pd-line)]" />
          ))}
        </div>
        <ul className="grid grid-cols-5 gap-6">
          {LEAKS.map(({ icon: Icon, title, line }) => (
            <li key={title}>
              <Icon className="size-10 text-[var(--pd-blue)]" strokeWidth={1.75} aria-hidden="true" />
              <p className="pd-h3 mt-6 text-[25px]">{title}</p>
              <p className="pd-small mt-3 text-[19px]">{line}</p>
            </li>
          ))}
        </ul>
      </div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. The solution: the pipeline (the deck's one big animated moment)
// ---------------------------------------------------------------------------------------------

const STAGES = [
  { icon: Megaphone, label: 'Facebook & Instagram ads' },
  { icon: LayoutTemplate, label: 'Homeowner funnel' },
  { icon: UserPlus, label: 'Lead capture' },
  { icon: Filter, label: 'Qualification' },
  { icon: MessageSquareText, label: 'Follow-up' },
  { icon: CalendarCheck, label: 'Appointment booking' },
  { icon: CalendarDays, label: 'Your calendar' },
  { icon: Handshake, label: 'Closed job' },
];

const STEP = 0.32; // seconds between stages lighting up

export function SolutionSlide() {
  const n = STAGES.length;
  const gap = 1392 / (n - 1);
  return (
    <Slide tone="mist">
      <Heading>One system. From first click to booked appointment.</Heading>
      <Lead>HomeQuote runs the customer acquisition. You focus on estimates and sales.</Lead>

      <div className="relative my-auto h-[250px]">
        {/* Track */}
        <div className="absolute left-0 right-0 top-[38px] h-[4px] rounded-full bg-[var(--pd-line)]" />
        <motion.div
          className="absolute left-0 top-[38px] h-[4px] origin-left rounded-full bg-[var(--pd-blue)]"
          style={{ width: 1392 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: STEP * (n - 1), ease: 'linear' }}
        />
        {/* The homeowner travelling along it */}
        <motion.span
          className="absolute top-[30px] size-5 -translate-x-1/2 rounded-full bg-[var(--pd-gold)] shadow-[0_0_0_6px_rgba(245,183,0,0.25)]"
          initial={{ left: 0 }}
          animate={{ left: 1392 }}
          transition={{ delay: 0.3, duration: STEP * (n - 1), ease: 'linear' }}
          aria-hidden="true"
        />
        <ol>
          {STAGES.map(({ icon: Icon, label }, i) => (
            <li key={label} className="absolute top-0 w-[150px] -translate-x-1/2 text-center" style={{ left: i * gap }}>
              <motion.span
                className={cn(
                  'mx-auto grid size-[80px] place-items-center rounded-2xl border-2',
                  i === n - 1 ? 'border-[var(--pd-navy)]' : 'border-[var(--pd-blue)]'
                )}
                initial={{ backgroundColor: '#ffffff', color: '#5b6b8c', borderColor: '#dce3ef' }}
                animate={{
                  backgroundColor: i === n - 1 ? '#0a1b3d' : '#0038b8',
                  color: '#ffffff',
                  borderColor: i === n - 1 ? '#0a1b3d' : '#0038b8',
                }}
                transition={{ delay: 0.3 + i * STEP, duration: 0.3 }}
              >
                <Icon className="size-8" strokeWidth={1.75} aria-hidden="true" />
              </motion.span>
              <p className="mt-4 text-[17px] font-semibold leading-snug">{label}</p>
            </li>
          ))}
        </ol>
        {/* Who does what */}
        <div className="absolute top-[190px] flex items-start" style={{ left: -60, width: gap * 6 + 120 }}>
          <div className="w-full border-t-2 border-[var(--pd-blue)] pt-3 text-center">
            <p className="text-[18px] font-semibold text-[var(--pd-blue)]">HomeQuote runs this</p>
          </div>
        </div>
        <div className="absolute top-[190px]" style={{ left: gap * 7 - 75, width: 150 }}>
          <div className="border-t-2 border-[var(--pd-navy)] pt-3 text-center">
            <p className="text-[18px] font-semibold">You close it</p>
          </div>
        </div>
      </div>
      <FinePrint>Texting, qualifying and booking are part of Managed Growth and Full Pipeline.</FinePrint>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 4. How it works
// ---------------------------------------------------------------------------------------------

const PHASES = [
  { verb: 'Attract', line: 'Campaigns reach homeowners in your area who are planning a remodel.' },
  { verb: 'Capture', line: 'Custom funnels collect the project details and contact information.' },
  { verb: 'Qualify', line: 'Depending on your package, our team calls and screens each homeowner.' },
  { verb: 'Convert', line: 'Qualified appointments go straight onto your calendar.' },
];

export function HowSlide() {
  return (
    <Slide tone="light">
      <Heading>How it works</Heading>
      <ol className="my-auto grid grid-cols-4">
        {PHASES.map((p, i) => (
          <li key={p.verb} className={cn('pr-8', i > 0 && 'border-l border-[var(--pd-line)] pl-8')}>
            <span className="pd-num font-display text-[120px] font-bold leading-none tracking-tight text-[#c9d6f5]">{i + 1}</span>
            <p className="pd-display mt-6 text-[44px]">{p.verb}</p>
            <p className="pd-body mt-4 text-[var(--pd-slate)]">{p.line}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 5. HomeQuote technology
// ---------------------------------------------------------------------------------------------

const BOARD = [
  { name: 'New', cards: [['Maria G.', 'Kitchen remodel', '2 min ago'], ['Dan R.', 'Bathroom', '18 min ago'], ['Priya S.', 'ADU', '1 h ago']] },
  { name: 'Contacted', cards: [['Tom W.', 'Roof replacement', 'Called 9:42 AM'], ['Alicia M.', 'Kitchen remodel', 'Texted 9:15 AM']] },
  { name: 'Appointment set', cards: [['Kevin L.', 'Pool remodel', 'Thu 10:00 AM'], ['Rosa D.', 'Bathroom', 'Fri 2:30 PM']] },
  { name: 'Estimate sent', cards: [['Greg H.', 'Kitchen remodel', 'Awaiting signature']] },
];

export function PlatformSlide() {
  return (
    <Slide tone="mist">
      <div className="grid min-h-0 flex-1 grid-cols-[540px_1fr] gap-16 pb-[40px]">
        <div className="flex flex-col">
          <Heading className="text-[52px]">The HomeQuote CRM</Heading>
          <Lead className="mt-4 text-[20px]">Every lead, call, appointment and document in one place, from day one.</Lead>
          <ul className="mt-7 grid gap-y-2">
            {PLATFORM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-4 border-b border-[var(--pd-line)] pb-2 text-[17px]">
                <span>{f.label}</span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
                    f.live ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                  )}
                >
                  {f.live ? 'Live' : 'Rolling out'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Product mock-up with sample data. */}
        <div className="relative self-center">
          <div className="overflow-hidden rounded-2xl border border-[var(--pd-line)] bg-white shadow-[0_40px_90px_-30px_rgba(10,27,61,0.35)]">
            <div className="flex items-center gap-2 border-b border-[var(--pd-line)] bg-[var(--pd-mist)] px-4 py-3">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-4 rounded-md bg-white px-3 py-1 text-[12px] text-[var(--pd-slate)]">homequotenet.com/app/leads</span>
            </div>
            <div className="flex">
              <aside className="w-[150px] shrink-0 border-r border-[var(--pd-line)] bg-[var(--pd-navy)] p-4 text-[13px] text-white/70">
                <BrandLogo tone="reversed" variant="mark" className="mb-5 size-8" />
                {['Leads', 'Appointments', 'Calendar', 'Documents', 'Workflows', 'Reports'].map((x, i) => (
                  <p key={x} className={cn('rounded-md px-2 py-1.5', i === 0 && 'bg-white/10 text-white')}>{x}</p>
                ))}
              </aside>
              <div className="flex-1 p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="text-[17px] font-semibold">Pipeline</p>
                  <p className="text-[12px] text-[var(--pd-slate)]">Sample data</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {BOARD.map((col) => (
                    <div key={col.name} className="rounded-xl bg-[var(--pd-mist)] p-2.5">
                      <p className="mb-2 flex justify-between px-1 text-[12px] font-semibold text-[var(--pd-slate)]">
                        {col.name}
                        <span className="pd-num">{col.cards.length}</span>
                      </p>
                      <div className="space-y-2">
                        {col.cards.map(([who, what, when]) => (
                          <div key={who} className="rounded-lg border border-[var(--pd-line)] bg-white p-2.5">
                            <p className="text-[13px] font-semibold">{who}</p>
                            <p className="text-[12px] text-[var(--pd-slate)]">{what}</p>
                            <p className="mt-1.5 text-[11px] font-medium text-[var(--pd-blue)]">{when}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 -left-10 w-[300px] rounded-xl border border-[var(--pd-line)] bg-white p-4 shadow-xl">
            <p className="text-[13px] font-semibold">Reminder sent to Kevin L.</p>
            <p className="mt-1 text-[12px] text-[var(--pd-slate)]">“See you Thursday at 10:00 AM for your pool estimate. Reply R to reschedule.”</p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

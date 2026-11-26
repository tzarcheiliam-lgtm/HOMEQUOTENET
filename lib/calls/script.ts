/**
 * The cold-call script shown beside every call (components/calls/call-script.tsx).
 * Source: the owner's "HomeQuote Cold Call Script" (flat monthly retainer
 * version, 2026-11-26) plus the prospect Q&A, lightly tightened. Placeholders
 * stay in [brackets]: fillScript() fills the ones the call page knows (the contact, company, caller and trade); the rest are
 * details the owner still has to decide, and the panel highlights them so a
 * caller never reads a bracket out loud.
 */

export interface ScriptLine {
  label: string;
  text: string;
}

export interface ScriptQA {
  q: string;
  a: string;
}

export const CALL_SCRIPT = {
  goal: 'Get a 10-minute follow-up booked. Not to close on the phone.',
  offer:
    'I run your ads, call and qualify every lead, and book the good ones straight onto your company’s calendar. Flat monthly retainer, you just show up and close.',

  /** What a "qualified appointment" means. Know it cold, say it with confidence. */
  qualified: [
    'They own the home. No renters, no “asking for my landlord.”',
    'They want the work done now, or within the next 3 to 6 months. Not “just curious,” not “someday.”',
    'The project matches your trade and the type of job you want more of.',
    'It’s in your service area.',
    'They have a realistic budget for the job, and we’ve talked numbers before you show up.',
    'Every decision-maker will be there (spouse, partner) so you’re not doing the pitch twice.',
    'They confirmed a specific day and time and know a [trade] pro is coming to quote.',
  ],

  openers: [
    {
      label: 'A: Thursday morning',
      text: 'Hey [Name], would it absolutely ruin your [Thursday] morning if I told you this is a cold call?',
    },
    {
      label: 'B: Straight up',
      text: 'Hey [Name], this is a cold call. I’ll be completely honest: give me 30 seconds, and if it’s not for you, tell me to hang up and I will.',
    },
    {
      label: 'C: Pattern interrupt',
      text: 'Hey [Name], I’m gonna be upfront, this is a cold call. You can hang up now, or give me 30 seconds to tell you why I called. Fair?',
    },
  ] satisfies ScriptLine[],
  afterOpener: 'Then STOP TALKING. Let them respond. The silence is the point.',

  pitch:
    'Appreciate it. What I do is simple: I get qualified appointments booked straight onto your company’s calendar. Homeowners who already want a quote on [their trade]. And when I say qualified, I mean they own the home, they want it done now or in the next 3 to 6 months, they’re in your area, they have the budget, and both decision-makers will be there. I run the ads, I call every lead myself, and I only book the ones with a real project and a budget. Not a list of ‘maybe leads’ you have to chase. It’s a flat monthly retainer, and we’ve done it for [trade] guys like [client / case study]. No ads, no chasing, no follow-up calls on your end. You show up to the appointment and quote the job.',
  pitchQuestion: 'Quick question, are you taking on more jobs right now, or are you full for the next couple months?',

  qualify: [
    'What kind of jobs do you want more of, and what’s your average ticket?',
    'What areas do you cover?',
    'Where are your jobs coming from right now: referrals, Google, Angi/Thumbtack?',
    'What’s a job worth to you when you close one?',
  ],
  qualifyTip: 'The last one sets up the ROI math below. Use their number, not yours.',
  roi: 'So if an average job is [$X], closing [one / two] extra jobs a month more than covers it. That math works, and you’re not paying for leads you have to chase, only for a calendar that’s already booked.',

  close:
    'Here’s what I’d suggest: let me jump on a quick 10-minute call so I can show you exactly how it works and what it would look like in your area. Are you free [tomorrow at 10] or would [Friday afternoon] be better?',
  closeTip:
    'Always offer two times. Never ask “when are you free?” If they say yes: confirm the best number and email, and send a calendar invite while still on the call.',

  objections: [
    {
      q: 'Not interested.',
      a: 'Totally fair. Can I ask, is it because you’re slammed with work, or you’ve been burned by lead companies before? (Then listen. 90% of the time it’s the second.)',
    },
    {
      q: 'I’ve been burned by lead companies.',
      a: 'That’s exactly why I do it differently. I don’t sell you leads. I run the ads for you, call every lead myself, and only book homeowners with a real project, a budget, and a time they confirmed. You never chase anyone.',
    },
    {
      q: 'How much?',
      a: 'It depends on the trade and your area, which is why I’d like 10 minutes to give you a real number instead of guessing. It’s a flat monthly retainer, and your ad budget goes straight to the ads. When are you free?',
    },
    {
      q: 'I don’t do retainers.',
      a: 'I get it, most retainers pay for ‘activity.’ Mine pays for booked appointments on your company’s calendar, and you’ll see every lead and every call. If one extra job a month covers it, is it worth 10 minutes to see the numbers? Thursday or Friday?',
    },
    {
      q: 'I get all my work from word of mouth / referrals.',
      a: 'That’s awesome, it means you do good work. Can I ask you something though: what happens when the referrals slow down? Word of mouth is great until it isn’t. You can’t turn it up when you need it, and one slow season can leave you with no jobs lined up and your guys sitting around. This doesn’t replace your referrals, it’s a steady stream on top of them that you control. Worth 10 minutes to see what that looks like? Thursday or Friday?',
    },
    {
      q: 'Send me an email.',
      a: 'Happy to. So I send you the right thing, what’s the one thing you’d want to know: pricing, how the appointments are qualified, or results we’ve gotten for other [trade] guys? (Then:) And let’s put 10 minutes on the calendar to go through it, so it doesn’t get buried. Thursday or Friday?',
    },
    {
      q: 'I’m too busy.',
      a: 'That’s actually the best time to hear this, because you don’t have to do anything. It’s only for when you want more work. Can I call you back [specific day/time]?',
    },
    {
      q: 'How do you get the appointments?',
      a: 'I run the marketing and do the screening on my end, so by the time it hits your company’s calendar it’s someone who owns the home, wants the work done in the next 3 to 6 months, has the budget, and confirmed a time with every decision-maker there. I’ll walk you through the exact process on the 10-minute call.',
    },
    {
      q: 'What if the appointment is bad?',
      a: 'Then I want to hear about it. We agree up front on what a qualified appointment is, and I screen every one against that before it hits your company’s calendar. Bad ones get flagged and I tighten the targeting.',
    },
    {
      q: 'I already have a marketing guy.',
      a: 'Great, this isn’t a replacement for everything he does. Does he also call your leads and book them on your company’s calendar? That’s the part most guys are missing.',
    },
    {
      q: 'Is this a scam?',
      a: 'Fair question. I’d ask the same. Look me up, homequotenet.com, and let’s do the 10-minute call so you can see how it works before you decide anything.',
    },
  ] satisfies ScriptQA[],

  faq: [
    {
      group: 'What it is',
      items: [
        {
          q: 'What’s a booked appointment?',
          a: 'It’s a homeowner who asked for a quote on [trade], that we’ve already talked to, checked out, and who agreed to a specific day and time for you to come out. It’s sitting on your calendar. It’s not a name and number you have to chase.',
        },
        {
          q: 'What do you mean by “qualified”?',
          a: 'They own the home, they want it done now or in the next 3 to 6 months, it’s a job you want in your area, they have a realistic budget and we’ve talked numbers, every decision-maker will be there, and they confirmed a day and time. We write your exact standard down together before anything starts.',
        },
        {
          q: 'So it’s just leads?',
          a: 'No. A lead is a phone number you chase. This is a time on your calendar with a homeowner who’s expecting you. We do the chasing, you do the quoting.',
        },
        {
          q: 'How is this different from Angi, Thumbtack or HomeAdvisor?',
          a: 'Those sell you contact info, often to three other guys, and you race to call it back. We run your ads, do the calling, the screening and the scheduling, and you get appointments on your calendar. What do you use now?',
        },
        {
          q: 'Who are you guys?',
          a: 'HomeQuote Network. We book appointments for home-service contractors, and it’s founder-led, so you deal directly with the person running it, Liam, not a rotating rep.',
        },
      ],
    },
    {
      group: 'How it works',
      items: [
        {
          q: 'How do you do it? / Walk me through it.',
          a: 'Four steps. One, we agree your trade, area, the jobs you want and when you’re available. Two, we run ads that bring homeowners in your area to ask for a quote. Three, we call them, check they fit, and book a day and time. Four, you show up, quote it, and close it. The job’s yours.',
        },
        {
          q: 'Where do the homeowners come from?',
          a: 'Ads we run for you, mostly Facebook and Instagram, sending homeowners to quote pages where they fill out their project. They come asking for a quote. No bought lists, ever.',
        },
        {
          q: 'What do you ask them?',
          a: 'What the project is, their ZIP and address, whether they own the home, when they want to start, their budget, and who else needs to be there. Then we confirm a time that works for them and for you.',
        },
        {
          q: 'Are these people ready, or just price shopping?',
          a: 'We screen for that. If they’re just checking prices on work they’re not planning to do in the next 3 to 6 months, they don’t get booked.',
        },
        {
          q: 'Who talks to the homeowner? Is it a robot?',
          a: 'They hear from us within minutes, usually by text first. Part of that first reply is automated so nobody waits. A person on our team calls them and confirms the appointment before it goes on your calendar.',
        },
        {
          q: 'How does it get on my calendar?',
          a: 'However works for you: your Google or Apple calendar, a booking link, or straight into your CRM. You get a text or email for every new one. We set your hours and how much notice you need up front.',
        },
        {
          q: 'What info do I get?',
          a: 'The homeowner’s name, phone and address, the type of project, when they want to start, their budget, and anything they told us. You walk in knowing the job. And you can see every lead and every call.',
        },
        {
          q: 'How many appointments can you get me?',
          a: 'Depends on your area, your ad budget and the jobs you want, and I won’t make up a number. I’ll show you what it would look like in your area on the 10-minute call.',
        },
      ],
    },
    {
      group: 'Money',
      items: [
        {
          q: 'How much?',
          a: 'Depends on the trade and your area, so I’d rather give you a real number on the 10-minute call than guess. It’s a flat monthly retainer, and your ad budget goes straight to the ads.',
        },
        {
          q: 'Is the ad budget included?',
          a: 'No, it’s separate, and every dollar of it goes to the ads, not to me. We set the amount together based on your area and how many jobs you want.',
        },
        {
          q: 'Is there a contract?',
          a: 'There’s a short written agreement so we’re both clear: what counts as qualified, your area, your price, and [contract length and how to cancel].',
        },
        {
          q: 'Do I still pay if I don’t close the job?',
          a: 'Yes. The retainer covers the ads, the calling and the booking, not the sale. The close is your part. Your price, your pitch, and the profit stays all yours.',
        },
        {
          q: 'How do I pay?',
          a: '[How billing works: invoice, card, how often.] I’ll walk you through it on the 10-minute call.',
        },
        {
          q: 'Why a retainer and not pay per lead?',
          a: 'Pay-per-lead means someone’s paid to send you more names, good or bad. A retainer means my job is filling your calendar with appointments that meet the standard we agreed. If one extra job a month covers it, the math works.',
        },
      ],
    },
    {
      group: 'Risk',
      items: [
        {
          q: 'What if they don’t show up?',
          a: 'Every one confirmed a day and time with every decision-maker, so it shouldn’t happen often. How no-shows are handled is written into your agreement up front: [How no-shows are handled.]',
        },
        {
          q: 'What if it’s a bad appointment, or a job I don’t do?',
          a: 'Then I want to hear about it. We agree up front on what qualified means, I screen every one against it, and bad ones get flagged so I tighten the targeting.',
        },
        {
          q: 'Are the appointments only mine, or do you send them to other contractors?',
          a: 'That depends on your area, and whatever applies to you is written into your agreement before launch. [Exclusive or shared in this area.]',
        },
        {
          q: 'Can you guarantee me jobs?',
          a: 'No, and be careful of anyone who does. What I stand behind is that every appointment met the standard we agreed. Closing it is on you.',
        },
        {
          q: 'What if the homeowner reschedules?',
          a: 'Reschedules and cancellations are handled by the same written rules as no-shows, agreed up front, so there’s no arguing after the fact.',
        },
      ],
    },
    {
      group: 'Fit',
      items: [
        {
          q: 'What trades do you work with?',
          a: 'Remodeling and general contractors, kitchen and bath, roofing, HVAC, fencing and pools. We only book the project types you choose.',
        },
        {
          q: 'I only want big jobs, not small repairs.',
          a: 'Good, that’s filtered. You pick the job types, and small repairs can be left out completely.',
        },
        {
          q: 'Do you cover my area?',
          a: 'We set your area by county, city or ZIP. Whether it’s open depends on who we already work with there, so I’ll confirm it on the call. What cities do you cover?',
        },
        {
          q: 'How soon can I start?',
          a: '[Timeline to first appointment.] First we agree your area, jobs and hours on the 10-minute call.',
        },
        {
          q: 'Who else do you work with? Got references?',
          a: 'We’ve done it for [trade] guys like [client / case study]. I’ll walk you through real numbers on the 10-minute call.',
        },
        {
          q: 'Can I use my own CRM?',
          a: 'Yes, appointments can go straight into it, plus a text or email.',
        },
      ],
    },
  ] satisfies { group: string; items: ScriptQA[] }[],

  gatekeeper: [
    {
      label: 'Ask for the owner',
      text: 'Hey, is [Owner Name] around? … It’s [Your Name] with HomeQuote. I’m calling about getting [Company] more booked appointments. It’ll take 30 seconds.',
    },
    {
      label: 'If they push for details',
      text: 'It’s a quick business conversation about new customer appointments. I’m happy to tell [Owner Name] directly.',
    },
    {
      label: 'If the owner isn’t available',
      text: 'No problem. When’s the best time to catch them? I’ll call back then.',
    },
  ] satisfies ScriptLine[],

  voicemail:
    'Hey [Name], it’s [Your Name] with HomeQuote. This is a cold call, I’ll be honest. I book qualified appointments for [trade] contractors: I run the ads, call the leads, and put the good ones on your company’s calendar. If it’s not a fit, no worries. If you want to hear how it works, call or text me at [number]. Again, [Your Name], [number]. Have a good one.',

  followUpText:
    'Hey [Name], [Your Name] from HomeQuote, just tried you. I book qualified appointments for [trade] contractors: I run the ads, call the leads, and put the good ones on your calendar. Worth a 10-minute call? Free [day] or [day]?',

  rules: [
    'Say the opener slow. Fast = telemarketer. Slow = confident.',
    'Never say “How are you today?” It’s the number one tell of a cold call.',
    'Every turn ends in a question. The person asking the questions controls the call.',
    'Know the qualified standard cold and say it with confidence: owns the home, 3 to 6 months, budget, every decision-maker there. That’s what separates us from a lead company.',
    'Get their average job value early. The ROI line only lands with their number.',
    'Don’t over-explain. The call’s job is the 10-minute follow-up.',
    'Log every call: answered, conversation, booked, objection heard. After 50 calls you’ll know which opener and objection response need fixing.',
  ],

  neverSay: [
    'Guaranteed jobs, sales, revenue or a close rate.',
    'That homeowners always show up.',
    'A price you weren’t given, for the retainer or the ad budget.',
    '“Exclusive” or “only yours” unless it’s confirmed for that area.',
    'Names of contractors we work with, or results, unless approved.',
    'A number of appointments per month.',
    'That a person does every step. The first reply is partly automated; a person calls and confirms the booking.',
  ],
} as const;

export interface ScriptVars {
  /** The person being called (decision-maker name), if known. */
  name?: string | null;
  company?: string | null;
  /** The caller's own name. */
  caller?: string | null;
  /** e.g. 'kitchen & bathroom remodeling'. */
  trade?: string | null;
}

/** 'Kitchen & Bathroom Remodeling Contractors' → 'kitchen & bathroom remodeling'. */
export function tradeFromNiche(niche: string | null | undefined): string | null {
  const t = (niche ?? '').replace(/\bcontractors?\b/gi, '').replace(/\s+/g, ' ').trim();
  return t ? t.toLowerCase() : null;
}

/**
 * Fills the placeholders the call page knows. Unknown values keep their
 * bracket, so splitPlaceholders() can still highlight them.
 */
export function fillScript(text: string, vars: ScriptVars): string {
  const first = vars.name?.trim().split(/\s+/)[0] || null;
  const map: Record<string, string | null> = {
    '[Name]': first,
    '[Owner Name]': vars.name?.trim() || null,
    '[Company]': vars.company?.trim() || null,
    '[Your Name]': vars.caller?.trim().split(/\s+/)[0] || null,
    '[trade]': vars.trade?.trim() || null,
    '[their trade]': vars.trade?.trim() || null,
  };
  return text.replace(/\[[^\]]+\]/g, (m) => map[m] ?? m);
}

/** Splits text into plain runs and still-unfilled [placeholders], for highlighting. */
export function splitPlaceholders(text: string): { text: string; blank: boolean }[] {
  const out: { text: string; blank: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[[^\]]+\]/g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), blank: false });
    out.push({ text: m[0], blank: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), blank: false });
  return out;
}

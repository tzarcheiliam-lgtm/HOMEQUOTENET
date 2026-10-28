import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CallScript } from '@/components/calls/call-script';
import { CALL_SCRIPT, fillScript, splitPlaceholders, tradeFromNiche } from '@/lib/calls/script';

const allText = (): string[] => {
  const s = CALL_SCRIPT;
  return [
    s.goal,
    s.offer,
    ...s.openers.map((o) => o.text),
    s.afterOpener,
    s.pitch,
    s.pitchQuestion,
    ...s.qualify,
    s.roi,
    s.close,
    s.closeTip,
    ...s.objections.flatMap((o) => [o.q, o.a]),
    ...s.faq.flatMap((g) => g.items.flatMap((i) => [i.q, i.a])),
    ...s.gatekeeper.map((g) => g.text),
    s.voicemail,
    s.followUpText,
    ...s.rules,
    ...s.neverSay,
  ];
};

describe('call script content', () => {
  it('uses only placeholders the page fills or the owner still has to decide', () => {
    const filled = ['[Name]', '[Owner Name]', '[Company]', '[Your Name]', '[trade]', '[their trade]'];
    const toDecide = [
      '[Thursday]', '[$ average job]', '[X]', '[tomorrow at 10]', '[Friday afternoon]', '[specific day/time]',
      '[How billing works: invoice, card, how often.]', '[test size]', '[X days]', '[Exclusive or shared in this area.]',
      '[Timeline to first appointment.]', '[number]', '[day]',
    ];
    const used = new Set(allText().flatMap((t) => t.match(/\[[^\]]+\]/g) ?? []));
    for (const p of used) expect([...filled, ...toDecide]).toContain(p);
  });

  it('never quotes a fixed price', () => {
    for (const t of allText()) expect(t).not.toMatch(/\$\d/);
  });

  it('answers the questions callers get asked', () => {
    const qs = CALL_SCRIPT.faq.flatMap((g) => g.items.map((i) => i.q));
    expect(qs).toEqual(expect.arrayContaining(['What’s a booked appointment?', 'How do you do it? / Walk me through it.']));
  });
});

describe('fillScript', () => {
  const vars = { name: 'Dana Reyes', company: 'Blue Lagoon Pools', caller: 'Sam Setter', trade: 'pool' };
  it('fills the contact, company, caller and trade', () => {
    expect(fillScript('Hey [Name], it’s [Your Name] with HomeQuote. [trade] contractors like [Company].', vars)).toBe(
      'Hey Dana, it’s Sam with HomeQuote. pool contractors like Blue Lagoon Pools.'
    );
    expect(fillScript('Is [Owner Name] around?', vars)).toBe('Is Dana Reyes around?');
  });
  it('leaves unknown values and decisions as brackets', () => {
    expect(fillScript('Hey [Name], within [X days].', {})).toBe('Hey [Name], within [X days].');
  });
});

describe('tradeFromNiche', () => {
  it('turns a niche label into spoken trade words', () => {
    expect(tradeFromNiche('Kitchen & Bathroom Remodeling Contractors')).toBe('kitchen & bathroom remodeling');
    expect(tradeFromNiche('Pool Contractors')).toBe('pool');
    expect(tradeFromNiche(null)).toBeNull();
    expect(tradeFromNiche('Contractors')).toBeNull();
  });
});

describe('splitPlaceholders', () => {
  it('marks only the brackets', () => {
    expect(splitPlaceholders('Call within [X days] please')).toEqual([
      { text: 'Call within ', blank: false },
      { text: '[X days]', blank: true },
      { text: ' please', blank: false },
    ]);
  });
});

describe('<CallScript>', () => {
  it('renders the new script with the prospect filled in and blanks highlighted', () => {
    const html = renderToStaticMarkup(
      <CallScript vars={{ name: 'Dana Reyes', company: 'Blue Lagoon Pools', caller: 'Sam Setter', trade: 'pool' }} />
    );
    expect(html).toContain('Hey Dana, would it absolutely ruin your');
    expect(html).toContain('Prospect Q&amp;A');
    expect(html).toContain('What’s a booked appointment?');
    expect(html).not.toContain('[Name]');
    expect(html).toMatch(/<mark[^>]*>\[X days\]<\/mark>/);
    expect(html).not.toContain('$125');
  });
});

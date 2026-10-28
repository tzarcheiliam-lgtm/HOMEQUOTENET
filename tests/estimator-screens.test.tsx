import { estimatorConsentText } from '@/lib/estimator/lead-client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EstimatorFlow } from '@/components/estimator/estimator-flow';
import { Estimator } from '@/components/estimator/estimator';
import { ResultScreen, type LeadSuccess } from '@/components/estimator/screens/result-screen';
import {
  buildLeadRequest,
  contactErrors,
  customizeTargetId,
  describeQuantity,
  flowScreens,
  initialFlowState,
  nextScreenId,
  parseDimensions,
  pickOption,
  prevScreenId,
  screenComplete,
  screenForErrorKey,
  safeHttpUrl,
  type FlowState,
} from '@/components/estimator/use-estimator-flow';
import { applyPackage, computeEstimate } from '@/lib/estimator/engine';
import type { Answers, ContractorEstimatorConfig, EstimatorQuestion, EstimatorTemplate } from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR, FIXTURE_TEMPLATE } from './fixtures/estimator-template';

/** The fixture plus the backyard-only extras question the real template has. */
const EXTRAS: EstimatorQuestion = {
  id: 'extras',
  label: 'Anything else for the backyard?',
  kind: 'multi',
  summaryLabel: 'Extra',
  showWhen: { questionId: 'project', anyOf: ['backyard'] },
  options: [
    { id: 'kitchen', label: 'Outdoor kitchen', price: { unit: 'flat', low: 8000, high: 12000 } },
    { id: 'fire_pit', label: 'Fire pit', price: { unit: 'flat', low: 2000, high: 3000 } },
  ],
};
const TEMPLATE: EstimatorTemplate = {
  ...FIXTURE_TEMPLATE,
  questions: [
    ...FIXTURE_TEMPLATE.questions.slice(0, FIXTURE_TEMPLATE.questions.length - 1),
    EXTRAS,
    FIXTURE_TEMPLATE.questions[FIXTURE_TEMPLATE.questions.length - 1],
  ],
};

const BASE: Answers = { project: ['remodel'], shape: ['rectangle'], size: ['medium'] };
const ids = (answers: Answers, opts: { customize?: boolean; hasGallery?: boolean } = {}) =>
  flowScreens(TEMPLATE, answers, { customize: false, hasGallery: false, ...opts }).map((s) => s.id);

describe('estimator flow sequencing', () => {
  it('starts with the basics, then the package question, and hides scope and details until a package is chosen', () => {
    expect(ids(BASE)).toEqual(['project', 'shape', 'size', 'package', 'property', 'zip', 'contact']);
  });

  it('skips the scope and detail screens on the package path and goes straight to the property screen', () => {
    const answers = applyPackage(TEMPLATE, BASE, 'refresh');
    const list = ids(answers);
    expect(list).toEqual(['project', 'shape', 'size', 'package', 'property', 'zip', 'contact']);
    const screens = flowScreens(TEMPLATE, answers, { customize: false, hasGallery: false });
    expect(nextScreenId(screens, 'package')).toBe('property');
    expect(prevScreenId(screens, 'property')).toBe('package');
  });

  it('on the package path a backyard project still asks about extras before the property screen', () => {
    const answers = applyPackage(TEMPLATE, { ...BASE, project: ['backyard'] }, 'refresh');
    expect(ids(answers)).toEqual(['project', 'shape', 'size', 'package', 'extras', 'property', 'zip', 'contact']);
    expect(ids(applyPackage(TEMPLATE, BASE, 'refresh'))).not.toContain('extras');
  });

  it('"Customize this package" reveals the scope and detail screens with the package answers pre-selected', () => {
    const answers = applyPackage(TEMPLATE, BASE, 'refresh');
    expect(ids(answers, { customize: true })).toEqual(['project', 'shape', 'size', 'package', 'scope', 'surface', 'edge', 'property', 'zip', 'contact']);
    expect(customizeTargetId(TEMPLATE, answers, false)).toBe('scope');
    const scope = flowScreens(TEMPLATE, answers, { customize: true, hasGallery: false }).find((s) => s.id === 'scope')!;
    expect(answers.scope).toEqual(['surface', 'coping']);
    expect(screenComplete(scope, { ...initialFlowState(answers) })).toBe(true);
  });

  it('"Build my own" shows scope, then only the details for what was picked', () => {
    const custom = applyPackage(TEMPLATE, BASE, 'custom');
    expect(ids(custom)).toEqual(['project', 'shape', 'size', 'package', 'scope', 'property', 'zip', 'contact']);
    expect(ids({ ...custom, scope: ['surface', 'deck'] })).toEqual([
      'project', 'shape', 'size', 'package', 'scope', 'surface', 'deck', 'deckSize', 'property', 'zip', 'contact',
    ]);
    expect(ids({ ...custom, scope: ['equipment'] })).toEqual(['project', 'shape', 'size', 'package', 'scope', 'equipment', 'property', 'zip', 'contact']);
  });

  it('shows the looks screen only when the contractor has gallery photos', () => {
    const answers = applyPackage(TEMPLATE, BASE, 'refresh');
    expect(ids(answers)).not.toContain('looks');
    expect(ids(answers, { hasGallery: true })).toEqual(['project', 'shape', 'size', 'package', 'property', 'looks', 'zip', 'contact']);
  });

  it('shows a template with no package question its scope and detail screens straight away', () => {
    const noPackages: EstimatorTemplate = { ...TEMPLATE, questions: TEMPLATE.questions.filter((q) => q.role !== 'package') };
    const list = flowScreens(noPackages, { scope: ['surface'] }, { customize: false, hasGallery: false }).map((s) => s.id);
    expect(list).toContain('scope');
    expect(list).toContain('surface');
  });

  it('puts questions that share a screen id on one screen, titled by screenTitle', () => {
    const answers = { ...applyPackage(TEMPLATE, BASE, 'custom'), scope: ['coping'] };
    const edge = flowScreens(TEMPLATE, answers, { customize: false, hasGallery: false }).find((s) => s.id === 'edge')!;
    expect(edge.title).toBe('Coping');
    const property = flowScreens(TEMPLATE, answers, { customize: false, hasGallery: false }).find((s) => s.id === 'property')!;
    expect(property.title).toBe('About your property');
  });
});

describe('estimator answers', () => {
  const state = initialFlowState(BASE);
  const q = (id: string) => TEMPLATE.questions.find((x) => x.id === id)!;

  it('replaces a single answer and toggles a multi answer', () => {
    const a = pickOption(TEMPLATE, state, q('shape'), 'l_shape');
    expect(a.answers.shape).toEqual(['l_shape']);
    const b = pickOption(TEMPLATE, pickOption(TEMPLATE, a, q('equipment'), 'pump'), q('equipment'), 'lights');
    expect(b.answers.equipment).toEqual(['pump', 'lights']);
    expect(pickOption(TEMPLATE, b, q('equipment'), 'pump').answers.equipment).toEqual(['lights']);
  });

  it('a package pick pre-fills the scope and closes the customize view', () => {
    const picked = pickOption(TEMPLATE, { ...state, customize: true }, q('package'), 'refresh');
    expect(picked.customize).toBe(false);
    expect(picked.answers.package).toEqual(['refresh']);
    expect(picked.answers.scope).toEqual(['surface', 'coping']);
    expect(state.answers.package).toBeUndefined();
  });

  it('enables Next only when the screen is answered (a multi needs one pick, the property screen needs all)', () => {
    const screens = flowScreens(TEMPLATE, { ...applyPackage(TEMPLATE, BASE, 'custom'), scope: ['equipment'] }, { customize: false, hasGallery: false });
    const equipment = screens.find((s) => s.id === 'equipment')!;
    expect(screenComplete(equipment, initialFlowState({ scope: ['equipment'] }))).toBe(false);
    expect(screenComplete(equipment, initialFlowState({ scope: ['equipment'], equipment: ['pump'] }))).toBe(true);
    const twoQuestions: typeof equipment = { ...equipment, questions: [q('equipment'), q('cracks')] };
    expect(screenComplete(twoQuestions, initialFlowState({ equipment: ['pump'] }))).toBe(false);
    expect(screenComplete(twoQuestions, initialFlowState({ equipment: ['pump'], cracks: ['no'] }))).toBe(true);
  });

  it('lets an optional multi question (backyard extras) continue with no picks', () => {
    const screens = flowScreens(TEMPLATE, { ...applyPackage(TEMPLATE, BASE, 'custom'), scope: ['equipment'] }, { customize: false, hasGallery: false });
    const equipment = screens.find((s) => s.id === 'equipment')!;
    const optional = { ...equipment, questions: [{ ...q('equipment'), optional: true }] };
    expect(screenComplete(optional, initialFlowState({ scope: ['equipment'] }))).toBe(true);
  });
});

describe('typed dimensions', () => {
  const dims = (length: string, width: string, depth = '') => ({ length, width, depth });
  it('is ignored while the toggle is off or nothing is typed', () => {
    expect(parseDimensions(TEMPLATE, dims('30', '15'), false)).toEqual({});
    expect(parseDimensions(TEMPLATE, dims('', ''), true)).toEqual({});
  });
  it('passes valid dimensions through, with an optional depth', () => {
    expect(parseDimensions(TEMPLATE, dims('30', '15'), true)).toEqual({ dimensions: { lengthFt: 30, widthFt: 15 } });
    expect(parseDimensions(TEMPLATE, dims('30', '15', '5.5'), true).dimensions).toEqual({ lengthFt: 30, widthFt: 15, avgDepthFt: 5.5 });
  });
  it('falls back to the preset with a hint when out of limits or incomplete', () => {
    for (const bad of [dims('200', '15'), dims('30', '2'), dims('abc', '15'), dims('30', '')]) {
      const r = parseDimensions(TEMPLATE, bad, true);
      expect(r.dimensions).toBeUndefined();
      expect(r.hint).toBeTruthy();
    }
  });
  it('keeps good length and width but drops a bad depth', () => {
    const r = parseDimensions(TEMPLATE, dims('30', '15', '40'), true);
    expect(r.dimensions).toEqual({ lengthFt: 30, widthFt: 15 });
    expect(r.hint).toMatch(/depth/i);
  });
});

describe('lead request', () => {
  const filled: FlowState = {
    ...initialFlowState({ ...applyPackage(TEMPLATE, { ...BASE, project: ['backyard'] }, 'refresh'), extras: ['fire_pit'], cracks: ['no'], deck: ['pavers'] }),
    knowDimensions: true,
    dimensions: { length: '30', width: '15', depth: '' },
    likedLooks: ['/photos/a.jpg'],
    zip: '90210',
    homeowner: 'yes',
    timeline: '1_3_months',
    contact: { firstName: ' Ana ', lastName: 'Lee', email: 'ana@example.com ', phone: '(555) 555-0100', consent: true, website: '', note: '  Gate is narrow  ' },
  };

  it('sends trimmed fields, valid dimensions, liked looks and only the answers that are still shown', () => {
    const req = buildLeadRequest(TEMPLATE, filled, { pageUrl: 'https://example.com/estimate' }, 'Consent wording');
    expect(req).toEqual({
      answers: {
        project: ['backyard'],
        shape: ['rectangle'],
        size: ['medium'],
        package: ['refresh'],
        scope: ['surface', 'coping'],
        surface: ['plaster'],
        coping: ['precast'],
        extras: ['fire_pit'],
        cracks: ['no'],
      },
      dimensions: { lengthFt: 30, widthFt: 15 },
      likedLooks: ['/photos/a.jpg'],
      note: 'Gate is narrow',
      zip: '90210',
      homeowner: 'yes',
      timeline: '1_3_months',
      contact: { firstName: 'Ana', lastName: 'Lee', email: 'ana@example.com', phone: '(555) 555-0100', consent: true, website: '' },
      consentText: 'Consent wording',
      measurement: false,
      tracking: { pageUrl: 'https://example.com/estimate' },
    });
    // Stale deck answer is gone (deck is hidden), and no prices are ever sent.
    expect(JSON.stringify(req)).not.toMatch(/"deck"|low|high|price/);
  });

  it('leaves out dimensions, looks and note when there are none', () => {
    const req = buildLeadRequest(TEMPLATE, { ...filled, knowDimensions: false, likedLooks: [], contact: { ...filled.contact, note: '   ' } });
    expect(req).not.toHaveProperty('dimensions');
    expect(req).not.toHaveProperty('likedLooks');
    expect(req).not.toHaveProperty('note');
    expect(req).not.toHaveProperty('tracking');
  });

  it('passes the honeypot through untouched so the server can drop bots', () => {
    expect(buildLeadRequest(TEMPLATE, { ...filled, contact: { ...filled.contact, website: 'http://spam.example' } }).contact.website).toBe('http://spam.example');
  });

  it('checks the contact fields before sending', () => {
    expect(contactErrors(filled.contact)).toEqual({});
    const errors = contactErrors({ ...filled.contact, firstName: '', email: 'nope', phone: '12', consent: false, note: 'x'.repeat(1001) });
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'firstName', 'note', 'phone']);
  });

  it('sends a server error for the ZIP back to the ZIP screen', () => {
    expect(screenForErrorKey('zip')).toBe('zip');
    expect(screenForErrorKey('email')).toBe('contact');
    expect(screenForErrorKey('mystery')).toBeUndefined();
  });
});

describe('plain-words helpers', () => {
  it('describes quantities and leaves flat prices without one', () => {
    expect(describeQuantity('perimeter_lf', 124)).toBe('124 linear ft');
    expect(describeQuantity('interior_sqft', 900)).toBe('about 900 sq ft');
    expect(describeQuantity('deck_sqft', 1000)).toBe('about 1,000 sq ft');
    expect(describeQuantity('each', 2)).toBe('2');
    expect(describeQuantity('flat', 1)).toBe('');
  });
  it('only follows http(s) and site-relative booking links', () => {
    expect(safeHttpUrl('https://example.com/book')).toBe('https://example.com/book');
    expect(safeHttpUrl('/book')).toBe('/book');
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const contractor = (patch: Partial<ContractorEstimatorConfig> = {}): ContractorEstimatorConfig => ({ ...FIXTURE_CONTRACTOR, ...patch });
const render = (screenId: string | undefined, patch: Partial<ContractorEstimatorConfig> = {}, state: Partial<FlowState> = {}, answers: Answers = BASE, embedded = false) =>
  renderToStaticMarkup(
    <EstimatorFlow template={TEMPLATE} contractor={contractor(patch)} embedded={embedded} seed={{ screenId, answers, state }} />,
  );

describe('estimator rendering', () => {
  it('renders the first screen of the fixture template through the public Estimator', () => {
    const html = renderToStaticMarkup(<Estimator template={FIXTURE_TEMPLATE} contractor={FIXTURE_CONTRACTOR} />);
    expect(html).toContain('What are you planning?');
    expect(html).toContain('Remodel my pool');
    // Named stages instead of "Step 1", and the rewards being worked toward.
    expect(html).not.toContain('Step 1');
    expect(html).toMatch(/role="group" aria-label="Your progress"/);
    expect(html).toContain('Pool, stage 1 of');
    expect(html).toMatch(/aria-current="step"/);
    expect(html).toContain('aria-label="What you get"');
    expect(html).toContain('Design, in progress');
    expect(html).toContain('Price, locked');
    expect(html).toMatch(/<fieldset/);
    expect(html).toMatch(/<legend/);
    expect(html).toMatch(/type="radio"/);
  });

  it('says "Example prices" while prices are not confirmed, and not once they are', () => {
    expect(render(undefined)).toContain('Example prices');
    const confirmed = renderToStaticMarkup(<EstimatorFlow template={{ ...TEMPLATE, pricesConfirmed: true }} contractor={contractor()} />);
    expect(confirmed).not.toContain('Example prices');
  });

  it('with after_contact never shows a dollar amount on any screen before the result', () => {
    const answers = applyPackage(TEMPLATE, { ...BASE, project: ['backyard'], extras: ['kitchen'], cracks: ['yes'] }, 'refresh');
    const full: Answers = { ...answers, deck: ['pavers'], deckSize: ['medium'], equipment: ['pump', 'lights'] };
    const lists: Array<{ answers: Answers; customize: boolean }> = [
      { answers: full, customize: false },
      { answers: full, customize: true },
      { answers: applyPackage(TEMPLATE, full, 'custom'), customize: false },
    ];
    for (const { answers: a, customize } of lists) {
      const state: Partial<FlowState> = { customize, knowDimensions: true, dimensions: { length: '30', width: '15', depth: '' }, zip: '90210' };
      const screens = flowScreens(TEMPLATE, a, { customize, hasGallery: true });
      for (const screen of screens) {
        const html = renderToStaticMarkup(
          <EstimatorFlow
            template={TEMPLATE}
            contractor={contractor({ gallery: [{ src: '/g/1.jpg', alt: 'Modern pool' }] })}
            seed={{ screenId: screen.id, answers: a, state }}
          />,
        );
        expect(html, `screen ${screen.id}`).not.toContain('$');
        expect(html).toContain('Price, locked');
      }
    }
  });

  it('with immediately shows the live range, unit price notes and the ballpark label', () => {
    const answers = applyPackage(TEMPLATE, BASE, 'refresh');
    const html = render('package', { revealRange: 'immediately' }, {}, answers);
    const expected = computeEstimate(TEMPLATE, { answers });
    expect(expected.low).not.toBeNull();
    expect(html).toContain('Your ballpark so far');
    expect(html).toContain('$');
    expect(html).toContain('Ballpark, not a quote');
    expect(html).not.toContain('Your price range appears at the end.');

    const surface = render('surface', { revealRange: 'immediately' }, { customize: true }, answers);
    expect(surface).toContain('$10 – $14 per sq ft');
  });

  it('keeps the live summary out of the page chrome when embedded', () => {
    const html = render('package', { revealRange: 'immediately' }, {}, applyPackage(TEMPLATE, BASE, 'refresh'), true);
    expect(html).toContain('Your ballpark so far');
    expect(html).not.toContain('fixed inset-x-0');
  });

  it('shows the package cards with a Most popular badge, Build my own and the customize link once a package is picked', () => {
    const none = render('package');
    expect(none).toContain('Refresh');
    expect(none).toContain('Most popular');
    expect(none).toContain('Build my own');
    expect(none).toContain('New surface and coping.');
    expect(none).toContain('Precast coping');
    expect(none).not.toContain('Customize this package');
    expect(render('package', {}, {}, applyPackage(TEMPLATE, BASE, 'refresh'))).toContain('Customize this package');
    expect(render('package', {}, {}, applyPackage(TEMPLATE, BASE, 'custom'))).not.toContain('Customize this package');
  });

  it('offers the customize link on later screens of the package path, and not once customizing', () => {
    const answers = applyPackage(TEMPLATE, BASE, 'refresh');
    expect(render('property', {}, {}, answers)).toContain('Customize this package');
    expect(render('property', {}, { customize: true }, answers)).not.toContain('Customize this package');
  });

  it('draws the shape tiles with PoolShapeIcon and swatches on options that have one', () => {
    expect(render('shape')).toMatch(/data-shape="l_shape"/);
    const answers = { ...applyPackage(TEMPLATE, BASE, 'custom'), scope: ['surface'] };
    expect(render('surface', {}, {}, answers)).toMatch(/data-swatch="pebble"/);
  });

  it('shows the size screen with an "I know my dimensions" toggle and a hint for out-of-limit values', () => {
    expect(render('size')).toContain('I know my dimensions');
    const html = render('size', {}, { knowDimensions: true, dimensions: { length: '300', width: '15', depth: '' } });
    expect(html).toContain('Length (ft)');
    expect(html).toContain('We will use the size you picked instead.');
  });

  it('renders the looks screen as optional photo tiles with a Skip button', () => {
    const html = render('looks', { gallery: [{ src: '/g/1.jpg', alt: 'Modern pool', caption: 'Clean lines' }] }, {}, applyPackage(TEMPLATE, BASE, 'refresh'));
    expect(html).toContain('Which look do you like?');
    expect(html).toContain('src="/g/1.jpg"');
    expect(html).toContain('Skip');
    expect(html).toMatch(/type="checkbox"/);
  });

  it('renders the ZIP screen with the timeline choices', () => {
    const html = render('zip');
    expect(html).toContain('Property ZIP code');
    expect(html).toContain('Do you own the home?');
    expect(html).toContain('As soon as possible');
    expect(html).toContain('Just researching');
  });

  it('renders the contact screen with the consent line, a hidden honeypot and a 1000-character note', () => {
    const html = render('contact');
    // The exact wording the funnel stores, naming HomeQuote Network and the contractor.
    expect(html).toContain(estimatorConsentText('Fixture Pools'));
    expect(html).toContain('I agree that HomeQuote Network and Fixture Pools may call, text, or email me');
    expect(html).toMatch(/href="\/privacy"/);
    expect(html).toMatch(/href="\/terms"/);
    expect(html).toContain('Allow optional advertising measurement');
    // Honeypot: hidden + inert, and not named like a field autofill would fill.
    expect(html).toMatch(/<div hidden="" inert=""[^>]*><label>[^<]*<input[^>]*tabindex="-1"[^>]*name="contact_url_2"/);
    expect(html).toMatch(/maxLength="1000"|maxlength="1000"/);
    expect(html).toContain('Anything else we should know?');
    expect(html).toMatch(/<button type="submit"[^>]*>Unlock my price<\/button>/);
  });

  it('disables Next until the screen is answered', () => {
    expect(render('project', {}, {}, {})).toMatch(/<button[^>]*disabled=""[^>]*>Next<\/button>/);
    expect(render('shape', {}, {}, BASE)).not.toMatch(/<button[^>]*disabled=""[^>]*>Next<\/button>/);
  });

  it('puts the live pool picture beside the questions: pinned under the site header, or the frame top when embedded', () => {
    const page = render('shape');
    expect(page).toContain('data-scene-panel="builder"');
    expect(page).toContain('class="ps-root');
    expect(page).toMatch(/lg:grid-cols-\[minmax\(0,57fr\)_minmax\(0,43fr\)\]/);
    expect(page).toMatch(/class="sticky top-16 [^"]*sm:top-20[^"]*lg:top-24/);
    expect(page).toContain('Illustration — your final design is confirmed at the on-site visit');
    // The picture comes before the question card, so phones see it first.
    expect(page.indexOf('data-scene-panel')).toBeLessThan(page.indexOf('What shape is your pool?'));
    const embedded = render('shape', {}, {}, BASE, true);
    expect(embedded).toMatch(/class="sticky top-0 [^"]*lg:top-3/);
    expect(embedded).not.toContain('top-16');
  });

  it('keeps a template for another trade picture-free', () => {
    const other = renderToStaticMarkup(<EstimatorFlow template={{ ...TEMPLATE, trade: 'roofing' }} contractor={contractor()} seed={{ screenId: 'shape', answers: BASE }} />);
    expect(other).not.toContain('data-scene-panel');
    expect(other).not.toContain('ps-root');
    expect(other).toContain('What shape is your pool?');
  });

  it('shows no Back button on the first screen and one on the others', () => {
    expect(render(undefined)).not.toContain('>Back<');
    expect(render('shape')).toContain('>Back<');
  });
});

describe('estimator result', () => {
  const answers: Answers = { ...applyPackage(TEMPLATE, BASE, 'refresh'), cracks: ['yes'] };
  const estimate = computeEstimate(TEMPLATE, { answers });
  const result: LeadSuccess = { ok: true, estimate, qualified: true };
  const view = (r: LeadSuccess, c: ContractorEstimatorConfig, embedded = false) =>
    renderToStaticMarkup(<ResultScreen template={TEMPLATE} contractor={c} result={r} embedded={embedded} />);

  it('shows the server range, the breakdown, site-visit items, exclusions, disclaimer and license', () => {
    const html = view(result, contractor());
    expect(estimate.low).not.toBeNull();
    expect(html).toContain('Ballpark, not a quote');
    expect(html).toContain('Surface: Plaster');
    expect(html).toContain('Coping: Precast concrete');
    expect(html).toMatch(/about [\d,]+ sq ft/);
    expect(html).toMatch(/[\d,]+ linear ft/);
    expect(html).toContain('Cracks or leaks');
    expect(html).toContain('Permits');
    expect(html).toContain(TEMPLATE.disclaimer);
    expect(html).toContain('CSLB #0000000');
  });

  it('links the booking button to the response calendar first, then the contractor calendar, and leaves the frame when embedded', () => {
    expect(view(result, contractor())).toContain('href="https://example.com/book"');
    const own = view({ ...result, calendarUrl: 'https://example.com/other' }, contractor());
    expect(own).toContain('href="https://example.com/other"');
    expect(own).toContain('Book your free on-site consultation');
    expect(own).not.toContain('target=');
    expect(view(result, contractor(), true)).toContain('target="_top"');
  });

  it('never prints a monthly payment, and shows the financing note and lender disclosure as plain text', () => {
    const html = view(result, contractor({ financingNote: 'Financing is available.', financingDisclosure: 'Subject to lender approval.' }));
    expect(html).toContain('Financing is available.');
    expect(html).toContain('Subject to lender approval.');
    expect(html).not.toMatch(/\/mo\b|per month|monthly/i);
  });

  it('for an unqualified lead promises a follow-up and offers no booking button', () => {
    const html = view({ ...result, qualified: false }, contractor());
    expect(html).toMatch(/team will review your details and reach out/);
    expect(html).not.toContain('Book your free on-site consultation');
  });

  it('is shown by the flow once a result exists', () => {
    const html = renderToStaticMarkup(
      <EstimatorFlow template={TEMPLATE} contractor={contractor()} seed={{ answers, result, state: { contact: { ...initialFlowState().contact, firstName: 'Ana' } } }} />,
    );
    expect(html).toContain('Ana, here’s your pool');
    expect(html).toContain('Your ballpark price');
    // Nothing is being made without a render token: no progress anywhere on the result.
    expect(html).not.toContain('role="progressbar"');
    expect(html).toContain('Price, done');
  });
});

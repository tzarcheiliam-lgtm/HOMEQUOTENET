/**
 * Reusable section library + the seven starter templates.
 *
 * LEGAL NOTE: all wording below is neutral STARTER TEXT written for HomeQuote Network, not legal advice. Every clause
 * that creates an obligation ends with a "[REVIEW: ...]" marker naming what counsel / the business must confirm.
 * Money, durations, cancellation, refund / replacement and guarantee terms are merge fields (never hard-coded).
 * The send step warns about remaining [REVIEW: ...] passages and records the sender's acknowledgement.
 */
import type { ContractSection, DocNode } from '@/lib/contracts/types';

// ---------------------------------------------------------------------------
// tiny builders
// ---------------------------------------------------------------------------
type Inline = string | DocNode;
const marksFor = (s: string): DocNode[] => {
  // **bold** and _italic_ (underscore pairs surrounded by non-word chars)
  const out: DocNode[] = [];
  const re = /\*\*([^*]+)\*\*|(?<![A-Za-z0-9{])_([^_]+)_(?![A-Za-z0-9}])/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if ((m.index ?? 0) > last) out.push({ type: 'text', text: s.slice(last, m.index) });
    if (m[1]) out.push({ type: 'text', text: m[1], marks: [{ type: 'bold' }] });
    else out.push({ type: 'text', text: m[2], marks: [{ type: 'italic' }] });
    last = (m.index ?? 0) + m[0].length;
  }
  if (last < s.length) out.push({ type: 'text', text: s.slice(last) });
  return out;
};
const inl = (parts: Inline[]): DocNode[] => parts.flatMap((p) => (typeof p === 'string' ? marksFor(p) : [p]));
export const P = (...parts: Inline[]): DocNode => ({ type: 'paragraph', content: inl(parts).filter((n) => n.text !== '') });
export const H = (text: string, level: 1 | 2 | 3 = 3): DocNode => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
export const UL = (...items: Inline[][]): DocNode => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [P(...i)] })) });
export const OL = (...items: Inline[][]): DocNode => ({ type: 'orderedList', content: items.map((i) => ({ type: 'listItem', content: [P(...i)] })) });
export const DOC = (...blocks: DocNode[]): DocNode => ({ type: 'doc', content: blocks });
/** A review marker: renders as visible, highlighted text and is counted before sending. */
export const REVIEW = (what: string) => P(`[REVIEW: ${what}]`);

const sec = (key: string, title: string, doc: DocNode, extra: Partial<ContractSection> = {}): ContractSection => ({
  id: `${key}`, key, kind: 'rich', title, showTitle: true, numbered: true, pageBreakBefore: false, doc, ...extra,
});

// ---------------------------------------------------------------------------
// Library sections (each returns a fresh copy)
// ---------------------------------------------------------------------------
export interface LibraryEntry { key: string; title: string; description: string; build: () => ContractSection }

const parties = () => sec('parties', 'Parties and Effective Date', DOC(
  P('This agreement (the “Agreement”) is entered into on {{contract_date}} between **{{homequote_company}}** (“HomeQuote”) and **{{client_company}}** (“Client”), and takes effect on {{effective_date}}.'),
  P('Client contact: {{client_name}} · {{client_email}} · {{client_phone}}'),
  P('Client address: {{client_address}}'),
));

const scope = () => sec('scope_of_services', 'Scope of Services', DOC(
  P('HomeQuote will provide the following service to Client: **{{service_name}}**.'),
  P('{{service_description}}'),
  H('Scope of work'),
  P('{{scope_of_work}}'),
  REVIEW('confirm deliverables, exclusions, service area and who performs each task before sending.'),
));

const paymentTerms = (lines: { label: string; v: string }[], intro = 'Client agrees to pay HomeQuote as follows:') => sec('payment_terms', 'Payment Terms', DOC(
  P(intro),
  UL(...lines.map((l) => [`${l.label}: **{{${l.v}}}**`] as Inline[])),
  H('Payment schedule'),
  P('{{payment_schedule}}'),
  REVIEW('confirm amounts, invoicing, late-payment and tax language. Signing this Agreement does not by itself activate billing or record any payment.'),
));

const advertising = () => sec('advertising_budget', 'Advertising Budget Responsibility', DOC(
  P('The planned advertising budget for this engagement is **{{advertising_budget}}**.'),
  P('Unless this Agreement says otherwise, advertising spend is paid by Client directly to the advertising platform and is separate from HomeQuote’s fees.'),
  REVIEW('confirm who funds and owns the ad accounts, how unspent budget is handled, and any minimum spend.'),
));

const qualification = () => sec('qualification_standards', 'Appointment Qualification Standards', DOC(
  P('An appointment counts under this Agreement only if it meets these standards:'),
  P('{{qualification_standards}}'),
  REVIEW('define how and by when Client may dispute an appointment, and who decides.'),
));

const refund = () => sec('refund_policy', 'Refund or Replacement Policy', DOC(
  P('{{refund_policy}}'),
  REVIEW('state the approved refund / replacement / guarantee terms, or remove this section. No results are promised by this template.'),
));

const cancellation = () => sec('cancellation_termination', 'Cancellation and Termination', DOC(
  P('This Agreement runs for **{{contract_duration}}** from the effective date. Either party may cancel by giving **{{cancellation_notice}}** in writing.'),
  REVIEW('confirm renewal, termination for cause, effect on unpaid fees, and what survives termination.'),
));

const confidentiality = () => sec('confidentiality', 'Confidentiality', DOC(
  P('Each party will protect the other party’s non-public business information received under this Agreement and use it only to perform this Agreement.'),
  REVIEW('counsel to supply the definition of confidential information, exclusions, duration and permitted disclosures.'),
));

const ip = () => sec('intellectual_property', 'Intellectual Property', DOC(
  P('Each party keeps ownership of its pre-existing materials, logos and trademarks. Any license to use them is limited to performing this Agreement.'),
  REVIEW('counsel to confirm ownership of work product (creative, websites, ad accounts, data) and any license grants.'),
));

const disputes = () => sec('dispute_resolution', 'Dispute Resolution', DOC(
  P('The parties will first try to resolve any dispute in good faith. This Agreement is governed by the laws of **{{governing_law}}**.'),
  REVIEW('counsel to confirm governing law, venue, and whether mediation or arbitration applies.'),
));

const additional = () => sec('additional_terms', 'Additional Terms', DOC(P('{{additional_terms}}')));

const dataPrivacy = () => sec('data_privacy', 'Data and Privacy', DOC(
  P('Each party will handle personal information received under this Agreement in line with applicable law and its own privacy notice.'),
  REVIEW('counsel to confirm data ownership, processing roles, retention, security and breach-notice terms.'),
));

const signatures = () => sec('signatures', 'Signatures', DOC(
  P('By signing below, each party agrees to this Agreement. Signatures are collected electronically.'),
), { kind: 'signatures', numbered: false, pageBreakBefore: false });

export const SECTION_LIBRARY: LibraryEntry[] = [
  { key: 'parties', title: 'Parties and Effective Date', description: 'Who the agreement is between and when it starts.', build: parties },
  { key: 'scope_of_services', title: 'Scope of Services', description: 'Service name, description and scope of work.', build: scope },
  { key: 'payment_terms', title: 'Payment Terms', description: 'Setup fee, retainer, per-appointment price and schedule.', build: () => paymentTerms([
    { label: 'Setup fee', v: 'setup_fee' }, { label: 'Monthly retainer', v: 'monthly_retainer' }, { label: 'Price per appointment', v: 'appointment_price' },
  ]) },
  { key: 'advertising_budget', title: 'Advertising Budget Responsibility', description: 'Who funds advertising spend.', build: advertising },
  { key: 'qualification_standards', title: 'Appointment Qualification Standards', description: 'What counts as a billable appointment.', build: qualification },
  { key: 'refund_policy', title: 'Refund or Replacement Policy', description: 'Configurable refund / replacement terms.', build: refund },
  { key: 'cancellation_termination', title: 'Cancellation and Termination', description: 'Duration and notice to cancel.', build: cancellation },
  { key: 'confidentiality', title: 'Confidentiality', description: 'Mutual confidentiality starter wording.', build: confidentiality },
  { key: 'intellectual_property', title: 'Intellectual Property', description: 'Ownership and license starter wording.', build: ip },
  { key: 'dispute_resolution', title: 'Dispute Resolution', description: 'Governing law and dispute steps.', build: disputes },
  { key: 'data_privacy', title: 'Data and Privacy', description: 'Personal information handling.', build: dataPrivacy },
  { key: 'additional_terms', title: 'Additional Terms', description: 'Free text for custom terms per client.', build: additional },
  { key: 'signatures', title: 'Signatures', description: 'Signature, printed name and date for every signer.', build: signatures },
];

export function librarySection(key: string): ContractSection | null {
  const e = SECTION_LIBRARY.find((x) => x.key === key);
  return e ? e.build() : null;
}

// ---------------------------------------------------------------------------
// Starter templates
// ---------------------------------------------------------------------------
export interface StarterTemplate {
  starterKey: string;
  name: string;
  description: string;
  category: string;
  defaultVariables: Record<string, string>;
  sections: ContractSection[];
}

const custom = (key: string, title: string, doc: DocNode): ContractSection => sec(key, title, doc);

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    starterKey: 'pay_per_appointment',
    name: 'Pay Per Booked Appointment Agreement',
    description: 'Client pays a set price for each qualified appointment HomeQuote books. No retainer.',
    category: 'Lead generation',
    defaultVariables: { service_name: 'Booked, qualified appointments' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Price per qualified appointment', v: 'appointment_price' }], 'Client agrees to pay HomeQuote for each qualified appointment as follows:'),
      qualification(), refund(), cancellation(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'managed_growth',
    name: 'Managed Growth System Agreement',
    description: 'Setup fee plus monthly retainer for HomeQuote to run lead generation, follow-up and reporting.',
    category: 'Managed services',
    defaultVariables: { service_name: 'Managed Growth System' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Setup fee', v: 'setup_fee' }, { label: 'Monthly retainer', v: 'monthly_retainer' }]),
      advertising(), refund(), cancellation(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'crm_subscription',
    name: 'CRM Subscription Agreement',
    description: 'Subscription access to the HomeQuote CRM, with an optional setup fee.',
    category: 'Software',
    defaultVariables: { service_name: 'HomeQuote CRM subscription' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Setup fee', v: 'setup_fee' }, { label: 'Monthly subscription', v: 'monthly_retainer' }], 'Client agrees to pay HomeQuote for CRM access as follows:'),
      cancellation(), dataPrivacy(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'website_development',
    name: 'Website Development Agreement',
    description: 'One-time website project with a project fee and payment milestones.',
    category: 'Websites',
    defaultVariables: { service_name: 'Website development' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Project fee', v: 'setup_fee' }], 'Client agrees to pay HomeQuote for the website project as follows:'),
      custom('acceptance', 'Delivery and Acceptance', DOC(
        P('HomeQuote will deliver the website described in the scope of work. Client will review the delivered website and tell HomeQuote in writing about anything that does not match the scope.'),
        REVIEW('counsel to define revision limits, review period, acceptance criteria and hosting / maintenance responsibilities.'))),
      ip(), cancellation(), confidentiality(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'ai_receptionist',
    name: 'AI Receptionist & Automation Agreement',
    description: 'AI call answering and follow-up automation with setup fee and monthly fee.',
    category: 'Automation',
    defaultVariables: { service_name: 'AI Receptionist & Automation' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Setup fee', v: 'setup_fee' }, { label: 'Monthly fee', v: 'monthly_retainer' }]),
      custom('communications_compliance', 'Calls, Messages and Consent', DOC(
        P('Client is responsible for having the permissions required to have calls and messages answered, recorded or sent on its behalf by automated tools, including any required disclosures.'),
        REVIEW('counsel to confirm call recording / consent disclosures, TCPA and state rules, opt-out handling and who is responsible for each.'))),
      dataPrivacy(), cancellation(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'marketing_advertising',
    name: 'Marketing and Advertising Management Agreement',
    description: 'HomeQuote manages Client’s advertising for a monthly management fee; ad spend is separate.',
    category: 'Managed services',
    defaultVariables: { service_name: 'Marketing and advertising management' },
    sections: [parties(), scope(),
      paymentTerms([{ label: 'Setup fee', v: 'setup_fee' }, { label: 'Monthly management fee', v: 'monthly_retainer' }]),
      advertising(),
      custom('account_access', 'Account Access and Ownership', DOC(
        P('Client keeps ownership of its business, brand and advertising accounts. Client will give HomeQuote the access needed to perform the services.'),
        REVIEW('counsel to confirm who owns ad accounts, pixels and audiences, access removal on termination, and reporting duties.'))),
      refund(), cancellation(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
  {
    starterKey: 'custom_service',
    name: 'Custom Service Agreement',
    description: 'A flexible agreement for anything else. Edit the sections for each client.',
    category: 'General',
    defaultVariables: {},
    sections: [parties(), scope(),
      sec('payment_terms', 'Payment Terms', DOC(P('{{payment_schedule}}'), REVIEW('state all fees and payment terms here.'))),
      cancellation(), confidentiality(), ip(), disputes(), additional(), signatures()],
  },
];

export const DEFAULT_SIGNER_ROLES = [
  { key: 'client', label: 'Client' },
  { key: 'homequote', label: 'HomeQuote Network' },
];

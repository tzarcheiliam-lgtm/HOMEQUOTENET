/**
 * The qualified booked appointment standard. Shared by the homepage section and
 * the /lead-standards route (visible title: "Booked Appointment Standards" —
 * the URL is unchanged so existing links keep working).
 *
 * IMPORTANT (compliance): this content describes the *general* standard only.
 * Every statement here must stay consistent with the partner agreement, which
 * is the governing document.
 *
 * The promise is precise, and the precision matters: HomeQuote Network
 * guarantees that anything billed as a booked appointment met the agreed
 * qualification and scheduling standard *at the time it was delivered*. It does
 * not guarantee the homeowner attends, or that the appointment becomes an
 * estimate or a signed job. Do not add close rates, contract values, revenue or
 * ROI to this file.
 */

export type StandardItem = {
  title: string;
  description: string;
};

export const validLeadCriteria: StandardItem[] = [
  {
    title: 'A real decision-maker',
    description:
      'The appointment is with an actual homeowner, property owner, or a person authorized to make decisions about the property.',
  },
  {
    title: 'Valid, reachable contact information',
    description:
      'The name, phone number, and other contact details are the homeowner’s real details, and the homeowner was reachable on them when the appointment was booked.',
  },
  {
    title: 'Inside your approved service area',
    description:
      'The property is within the service area agreed with you before launch — by county, city, or ZIP code.',
  },
  {
    title: 'One of your agreed services',
    description:
      'The homeowner asked about a service you selected, such as a kitchen remodel, roof replacement, new fence, AC replacement, or pool renovation.',
  },
  {
    title: 'Genuine project interest',
    description:
      'The homeowner described a real project they intend to move on, rather than a price-check on work they are not planning.',
  },
  {
    title: 'A specific date and time',
    description:
      'The homeowner agreed to a named appointment slot on your calendar — not a vague promise to talk later.',
  },
  {
    title: 'Not fraudulent',
    description:
      'The appointment was not generated through fraud, bots, purchased lists, or deliberate falsification. Those are never billable.',
  },
  {
    title: 'Within your agreement’s rules',
    description:
      'It complies with the written duplicate, cancellation, rescheduling, and no-show rules in your individual contractor agreement.',
  },
];

/**
 * What is explicitly NOT promised. Kept as first-class content so it is as
 * visible as the criteria themselves. The booked appointment is the deliverable;
 * everything that happens after it is the contractor's to win.
 */
export const notPromised: string[] = [
  'That every scheduled homeowner will answer every follow-up call',
  'That every homeowner will keep the appointment, or will not reschedule',
  'That every appointment will result in an estimate',
  'That every estimate will become a signed job',
  'Any particular close rate, contract value, revenue, profit, or return on ad spend',
  'Any guaranteed number of closed jobs',
];

export const confirmedBeforeLaunch: StandardItem[] = [
  {
    title: 'The qualification standard',
    description:
      'The precise criteria an appointment must meet before it is billable, written down before the first one is booked.',
  },
  {
    title: 'Replacement and credit policy',
    description:
      'What happens when an appointment does not meet the agreed standard, and whether it is replaced or credited.',
  },
  {
    title: 'Cancellations, reschedules, and no-shows',
    description:
      'How each is treated, and which of them qualify for replacement under your agreement.',
  },
  {
    title: 'Pricing',
    description:
      'Your price per booked appointment, based on project types, market, qualification requirements, and volume.',
  },
  {
    title: 'Service areas',
    description:
      'The counties, cities, or ZIP codes that define where your appointments come from.',
  },
  {
    title: 'Calendar and availability',
    description:
      'How we access your calendar, the hours you accept appointments, and how much notice you need.',
  },
];

/** The dispute flow, described as process rather than as a legal commitment. */
export const disputeProcess: StandardItem[] = [
  {
    title: '1. Flag the appointment',
    description:
      'Report it through the agreed channel within the dispute window in your agreement, with the reason it does not meet the standard.',
  },
  {
    title: '2. Review',
    description:
      'We check the booking record, the service area, the requested service, the contact details, and the scheduled slot against the agreed standard.',
  },
  {
    title: '3. Resolution',
    description:
      'If it falls outside the agreed standard, it is resolved under the replacement or credit terms written into your agreement.',
  },
];

/**
 * The exact scope of the guarantee. Used verbatim wherever the promise needs
 * stating precisely — it is deliberately narrow.
 */
export const guaranteeScope =
  'We guarantee that anything billed as a booked appointment met the agreed qualification and scheduling standard when it was delivered. We do not guarantee attendance or sales. Cancellations, reschedules, unreachable homeowners, duplicates, invalid information, and no-shows are handled under the written replacement and dispute policy in your agreement.';

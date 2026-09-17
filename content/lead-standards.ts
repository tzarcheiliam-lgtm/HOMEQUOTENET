/**
 * The valid-lead standard. Shared by the homepage section and /lead-standards.
 *
 * IMPORTANT (compliance): this content describes the *general* standard only.
 * Every statement here must stay consistent with the partner agreement, which
 * is the governing document. Do not add guarantees of contact rate, appointment
 * rate, close rate, revenue, or ROI to this file.
 */

export type StandardItem = {
  title: string;
  description: string;
};

export const validLeadCriteria: StandardItem[] = [
  {
    title: 'A real decision-maker',
    description:
      'The inquiry comes from an actual homeowner, property owner, or a person authorized to make decisions about the property.',
  },
  {
    title: 'Accurate contact information',
    description:
      'The name, phone number, and other contact details submitted are the homeowner’s real, reachable details.',
  },
  {
    title: 'Inside your approved service area',
    description:
      'The project is located within the service area agreed with you before launch — by county, city, or ZIP code.',
  },
  {
    title: 'The homeowner asked',
    description:
      'The homeowner requested information about a relevant service. Leads are generated from inquiries, not from purchased or scraped lists.',
  },
  {
    title: 'Matches your agreed services',
    description:
      'The requested project falls inside the project categories you selected, such as resurfacing, tile and coping, decking, or a full renovation.',
  },
  {
    title: 'Not fake or fraudulent',
    description:
      'Test submissions, deliberately falsified entries, bot traffic, and fraudulent inquiries are not valid leads and are not billable.',
  },
  {
    title: 'Follows duplicate and exclusivity rules',
    description:
      'The lead complies with the duplicate handling and exclusivity terms stated in your individual contractor agreement.',
  },
];

/**
 * What is explicitly NOT promised. Kept as first-class content so it is as
 * visible as the criteria themselves.
 */
export const notPromised: string[] = [
  'That every homeowner will answer the phone or reply',
  'That every lead will schedule an appointment',
  'That every lead will request an estimate',
  'That every lead will purchase',
  'Any specific revenue, return on ad spend, or profitability',
  'Any guaranteed number of closed jobs',
];

export const confirmedBeforeLaunch: StandardItem[] = [
  {
    title: 'Exact lead standards',
    description:
      'The precise qualification criteria applied to your leads, written down before the first lead is delivered.',
  },
  {
    title: 'Replacement and credit policy',
    description:
      'What happens when a lead does not meet the agreed standard, and whether it is replaced or credited.',
  },
  {
    title: 'Dispute window',
    description:
      'How long you have to flag a lead as invalid, and the information required to review it.',
  },
  {
    title: 'Pricing',
    description:
      'Your per-lead pricing, based on project types, market, qualification requirements, volume, and exclusivity.',
  },
  {
    title: 'Service areas',
    description:
      'The counties, cities, or ZIP codes that define where your leads come from.',
  },
  {
    title: 'Exclusivity terms',
    description:
      'Whether your programme includes exclusive leads, and under what conditions.',
  },
];

/** The dispute flow, described as process rather than as a legal commitment. */
export const disputeProcess: StandardItem[] = [
  {
    title: '1. Flag the lead',
    description:
      'Report the lead through the agreed channel within the dispute window in your agreement, with the reason it does not meet the standard.',
  },
  {
    title: '2. Review',
    description:
      'We check the submission record, the service area, the requested project type, and the contact details against the agreed standard.',
  },
  {
    title: '3. Resolution',
    description:
      'If the lead falls outside the agreed standard, it is resolved under the replacement or credit terms written into your agreement.',
  },
];

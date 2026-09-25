import { buildBrandedEmailHtml, buildBrandedEmailText, emailLogoUrl } from '@/lib/emails/template';
import { variablesIn } from '@/lib/emails/variables';

export interface EmailTemplateSeed {
  key: string;
  category: string;
  name: string;
  subject: string;
  description: string;
  contractorVisible: boolean;
  paragraphs: string[];
  cta?: { text: string; url: string };
}

export const EMAIL_TEMPLATE_CATEGORIES = [
  'Homeowner Follow-Up',
  'Appointments',
  'Estimate Follow-Up',
  'Contractor Sales',
  'Contractor Onboarding',
  'Upsells',
  'Billing',
  'Reporting',
  'Internal Notifications',
] as const;

const PORTAL_CTA = { text: 'Open your HomeQuote portal', url: '{{homequote.portal_url}}' };

export const EMAIL_TEMPLATE_LIBRARY: EmailTemplateSeed[] = [
  // ------------------------------------------------------------- Homeowner Follow-Up
  {
    key: 'homeowner_new_lead_confirmation',
    category: 'Homeowner Follow-Up',
    name: 'New Lead Confirmation',
    subject: 'We Received Your Project Request',
    description: 'Confirms receipt right after a homeowner submits a project request.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Thanks for telling us about your {{lead.service_type}} project. We've got your details and a member of our team will be reaching out shortly to confirm a few things and get you matched with the right contractor.",
      "In the meantime, feel free to reply to this email if anything changes or if you'd like to add more detail about your project.",
    ],
  },
  {
    key: 'homeowner_no_answer',
    category: 'Homeowner Follow-Up',
    name: "Lead Didn't Answer",
    subject: 'Tried Reaching You About Your Project',
    description: 'Short, casual follow-up after an unanswered call attempt.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Tried giving you a call about your {{lead.service_type}} project but couldn't reach you. No worries — happens all the time.",
      "When's a good time for a quick call? Just reply here with a day/time that works and we'll call you then.",
    ],
  },
  {
    key: 'homeowner_second_follow_up',
    category: 'Homeowner Follow-Up',
    name: 'Second Follow-Up',
    subject: 'Still Looking for Help With Your {{lead.service_type}}?',
    description: 'Re-engages a homeowner after no response to the first follow-up.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Wanted to check back in — are you still looking for help with your {{lead.service_type}} project? If so, we'd love to get you connected with a contractor in {{lead.city}}.",
      "Just reply with a good time to talk, or let us know if your plans have changed.",
    ],
  },
  {
    key: 'homeowner_final_follow_up',
    category: 'Homeowner Follow-Up',
    name: 'Final Follow-Up',
    subject: 'Still Want an Estimate for Your {{lead.service_type}}?',
    description: 'Final gentle follow-up before the lead moves to long-term nurture.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "This is my last check-in for now on your {{lead.service_type}} project. If you're still interested in an estimate, just reply and we'll get it moving.",
      "If the timing isn't right, that's totally fine — we'll keep your info on file in case you want to revisit this down the road.",
    ],
  },
  // ------------------------------------------------------------- Appointments
  {
    key: 'appointment_confirmation_homeowner',
    category: 'Appointments',
    name: 'Booked Appointment Confirmation — Homeowner',
    subject: 'Your HomeQuote Appointment Is Confirmed',
    description: 'Sent to the homeowner once an appointment is booked.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "You're all set! {{contractor.name}} is confirmed to meet with you about your {{lead.service_type}} project.",
      'Date: {{appointment.date}}\nTime: {{appointment.time}}\nAddress: {{appointment.location}}',
      "If anything comes up and you need to reschedule, just reply to this email and we'll take care of it.",
    ],
  },
  {
    key: 'appointment_notification_contractor',
    category: 'Appointments',
    name: 'Booked Appointment Notification — Contractor',
    subject: 'New Appointment Booked — {{lead.first_name}} — {{appointment.date}}',
    description: 'Sent to the contractor with the details they need to show up prepared.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      'A new appointment has been booked for {{lead.service_type}}.',
      'Homeowner: {{lead.full_name}}\nPhone: {{lead.phone}}\nAddress: {{appointment.location}}\nProject: {{lead.project_description}}\nDate/Time: {{appointment.date}} at {{appointment.time}}',
      "Please confirm with the homeowner before the appointment. Update the lead status in your portal once you've met.",
    ],
  },
  {
    key: 'appointment_reminder_homeowner',
    category: 'Appointments',
    name: 'Appointment Reminder — Homeowner',
    subject: 'Reminder: Your Appointment Is Coming Up',
    description: 'Reminds the homeowner of an upcoming appointment.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      'Quick reminder — {{contractor.name}} is scheduled to meet with you on {{appointment.date}} at {{appointment.time}}.',
      "Address on file: {{appointment.location}}. See you then! Reply here if you need to reschedule.",
    ],
  },
  {
    key: 'appointment_reminder_contractor',
    category: 'Appointments',
    name: 'Appointment Reminder — Contractor',
    subject: 'Reminder: Appointment With {{lead.first_name}}',
    description: 'Reminds the contractor of an upcoming appointment.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      'Reminder that you have an appointment with {{lead.full_name}} on {{appointment.date}} at {{appointment.time}}.',
      'Address: {{appointment.location}}\nPhone: {{lead.phone}}',
    ],
  },
  {
    key: 'appointment_reschedule',
    category: 'Appointments',
    name: 'Appointment Reschedule',
    subject: "Let's Find Another Time for Your Estimate",
    description: 'Sent to the homeowner when an appointment needs to move.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "We need to move your appointment for {{lead.service_type}}. Sorry for the shuffle — what times work best for you this week?",
      "Reply with a couple of options and we'll get it rebooked with {{contractor.name}} right away.",
    ],
  },
  {
    key: 'appointment_no_show_recovery',
    category: 'Appointments',
    name: 'No-Show Recovery',
    subject: 'Would You Like to Reschedule Your Estimate?',
    description: 'Friendly, non-accusatory outreach after a missed appointment.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Looks like we missed each other for your {{appointment.date}} appointment — totally understandable, things come up.",
      "Want to grab a new time to get your {{lead.service_type}} estimate scheduled? Just reply with what works and we'll get it back on the calendar.",
    ],
  },
  // ------------------------------------------------------------- Estimate Follow-Up
  {
    key: 'estimate_follow_up_day1',
    category: 'Estimate Follow-Up',
    name: 'Estimate Follow-Up — Day 1',
    subject: 'Following Up on Your {{lead.service_type}} Estimate',
    description: 'First check-in the day after an estimate is delivered.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Wanted to follow up on the estimate {{contractor.name}} put together for your {{lead.service_type}} project.",
      "Any questions so far? Happy to walk through the details with you.",
    ],
  },
  {
    key: 'estimate_follow_up_day3',
    category: 'Estimate Follow-Up',
    name: 'Estimate Follow-Up — Day 3',
    subject: 'Any Questions About Your Estimate?',
    description: 'Second check-in a few days after the estimate.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Checking back in on the {{lead.service_type}} estimate — no pressure, just want to make sure you have everything you need to decide.",
      "Let us know if you'd like to talk through pricing, timeline, or anything else.",
    ],
  },
  {
    key: 'estimate_follow_up_day7',
    category: 'Estimate Follow-Up',
    name: 'Estimate Follow-Up — Day 7',
    subject: 'Checking In on Your {{lead.service_type}}',
    description: 'Week-mark follow-up after the estimate.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "It's been about a week since your {{lead.service_type}} estimate — just checking in to see where things stand on your end.",
      "If you're comparing options or have questions, reply here and we'll help however we can.",
    ],
  },
  {
    key: 'estimate_follow_up_final',
    category: 'Estimate Follow-Up',
    name: 'Estimate Follow-Up — Final',
    subject: 'Still Planning to Move Forward With Your {{lead.service_type}}?',
    description: 'Final estimate follow-up before the lead goes cold.',
    contractorVisible: true,
    paragraphs: [
      'Hi {{lead.first_name}},',
      "Last check-in on your {{lead.service_type}} estimate — are you still planning to move forward?",
      "If timing has changed, no problem at all. Just let us know and we'll follow up whenever you're ready.",
    ],
  },
  // ------------------------------------------------------------- Contractor Sales
  {
    key: 'contractor_more_info_requested',
    category: 'Contractor Sales',
    name: 'Contractor More Info Requested',
    subject: 'HomeQuote — Booked Homeowner Appointments',
    description: 'Explains the HomeQuote offer to a prospective contractor.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Thanks for your interest in HomeQuote. Here's how it works: we generate homeowner leads, contact and qualify each one, then book a confirmed appointment directly on your calendar — you just show up and quote the job.",
      "Current pricing is around $200 per booked appointment, and we only bill for appointments that are actually scheduled.",
      "Happy to answer any questions or set up a quick call whenever works for you.",
    ],
  },
  {
    key: 'contractor_post_sales_call',
    category: 'Contractor Sales',
    name: 'Contractor Post-Sales Call',
    subject: 'Great Speaking With You — HomeQuote',
    description: 'Recap sent after a sales call with a prospective contractor.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      'Great talking with you today. Quick recap: booked homeowner appointments in your service area, at $200 per appointment, no long-term commitment.',
      "Next step is a small trial batch so you can see the lead quality firsthand. Let me know if you'd like to get started.",
    ],
  },
  {
    key: 'contractor_no_response_after_call',
    category: 'Contractor Sales',
    name: 'Contractor No Response After Sales Call',
    subject: 'Still Interested in Testing HomeQuote?',
    description: 'Short nudge when a contractor goes quiet after a sales call.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Haven't heard back since our call — still interested in testing HomeQuote out?",
      "Happy to answer questions or just get a small trial going whenever you're ready.",
    ],
  },
  {
    key: 'contractor_second_follow_up',
    category: 'Contractor Sales',
    name: 'Contractor Second Follow-Up',
    subject: 'Want Me to Hold Your Area?',
    description: 'Second sales follow-up. Only use when area exclusivity is actually being held.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Following up on HomeQuote for {{lead.city}} — a couple of other contractors in the area have asked about coverage.",
      "Want me to go ahead and hold your area while you decide? Just reply and I'll take care of it.",
    ],
  },
  {
    key: 'contractor_trial_offer',
    category: 'Contractor Sales',
    name: 'Contractor Trial / Test Offer',
    subject: 'Start With a Small HomeQuote Test',
    description: 'Offers a low-commitment trial batch of leads.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "No need to commit to anything big — we can start with a small batch of booked appointments so you can see the quality before deciding on volume.",
      "Want me to set that up this week?",
    ],
  },
  // ------------------------------------------------------------- Contractor Onboarding
  {
    key: 'contractor_welcome',
    category: 'Contractor Onboarding',
    name: 'Welcome to HomeQuote',
    subject: 'Welcome to HomeQuote',
    description: 'Sent when a contractor account is activated.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Welcome to HomeQuote! Your account for {{contractor.name}} is live. Booked appointments will show up in your portal, and we'll notify you by email as each one comes in.",
      "If you have any questions getting started, just reply to this email — we're here to help.",
    ],
    cta: PORTAL_CTA,
  },
  {
    key: 'contractor_portal_setup',
    category: 'Contractor Onboarding',
    name: 'Contractor Portal Setup',
    subject: 'Your HomeQuote Portal Is Ready',
    description: 'Points a new contractor to their portal login.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      'Your HomeQuote portal is set up and ready to go. From there you can view booked appointments, update lead status, and see your account activity.',
    ],
    cta: PORTAL_CTA,
  },
  {
    key: 'contractor_first_lead_expectations',
    category: 'Contractor Onboarding',
    name: 'First Lead Expectations',
    subject: 'What to Expect From Your HomeQuote Leads',
    description: 'Sets expectations before the first leads start arriving.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      'Every homeowner is qualified and followed up with before an appointment lands on your calendar. Once booked, please confirm quickly — a fast response makes a big difference in show rate.',
      "After each appointment, update the outcome in your portal so we can keep the pipeline accurate.",
    ],
  },
  {
    key: 'contractor_best_practices',
    category: 'Contractor Onboarding',
    name: 'Contractor Best Practices',
    subject: 'How to Get the Most From HomeQuote',
    description: 'Playbook email for getting the best results from HomeQuote leads.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "A few things that consistently drive better results: confirm appointments as soon as they're booked, call homeowners quickly, and follow up consistently after the visit.",
      "Update lead status in your portal after every appointment — it's the best way to track outcomes and keep your pipeline accurate.",
    ],
  },
  // ------------------------------------------------------------- Upsells
  {
    key: 'upsell_request_received',
    category: 'Upsells',
    name: 'Upsell Request Received',
    subject: 'We Got Your {{lead.service_type}} Request',
    description: 'Confirms a contractor upsell/add-on request was received.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Got your request — our team will follow up shortly with next steps.",
    ],
  },
  {
    key: 'upsell_ai_receptionist',
    category: 'Upsells',
    name: 'AI Receptionist',
    subject: 'Never Miss Another Homeowner Call',
    description: 'Pitches the AI receptionist add-on.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Missed calls are missed jobs. Our AI receptionist answers 24/7, qualifies the homeowner, and books the appointment straight onto your calendar — with a confirmation sent automatically.",
      "Want a quick walkthrough of how it'd work for {{contractor.name}}?",
    ],
  },
  {
    key: 'upsell_automated_follow_up',
    category: 'Upsells',
    name: 'Automated Follow-Up',
    subject: 'Let HomeQuote Follow Up for You',
    description: 'Pitches automated follow-up sequences.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can automate no-answer recovery, appointment reminders, estimate follow-up, and no-show recovery — so fewer leads slip through the cracks without any extra work on your end.",
      "Want me to set it up for your account?",
    ],
  },
  {
    key: 'upsell_website_landing_page',
    category: 'Upsells',
    name: 'Website / Landing Page',
    subject: 'Turn More Traffic Into Homeowner Leads',
    description: 'Pitches a contractor-specific landing page.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "A dedicated landing page for {{contractor.name}} — built with lead forms, tracking, and mobile optimization — turns more of your traffic into booked appointments.",
      "Pricing starts at $500. Want to see an example?",
    ],
  },
  {
    key: 'upsell_custom_lead_funnel',
    category: 'Upsells',
    name: 'Custom Lead Funnel',
    subject: 'Get a Funnel Built Around Your Business',
    description: 'Pitches a custom lead funnel.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can build a lead funnel tailored to {{contractor.name}} — your services, your service area, your branding — to bring in more qualified homeowner leads.",
      "Want to see what that would look like?",
    ],
  },
  {
    key: 'upsell_old_lead_reactivation',
    category: 'Upsells',
    name: 'Old Lead Reactivation',
    subject: 'You May Already Be Sitting on More Jobs',
    description: 'Pitches reactivating a contractor\'s old, cold leads.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "There are likely jobs still sitting in your old lead list. We can run a reactivation pass to find homeowners who are ready to move forward now.",
      "Want us to take a look?",
    ],
  },
  {
    key: 'upsell_call_lead_tracking',
    category: 'Upsells',
    name: 'Call & Lead Tracking',
    subject: 'See Where Every Lead and Call Comes From',
    description: 'Pitches call and lead source tracking.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Know exactly which source is driving your leads and calls, down to the campaign, so you can spend with confidence.",
      "Want us to get this set up for {{contractor.name}}?",
    ],
  },
  {
    key: 'upsell_review_generation',
    category: 'Upsells',
    name: 'Review Generation',
    subject: 'Turn Happy Customers Into More Reviews',
    description: 'Pitches automated review requests.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can automatically reach out to happy customers after a job wraps up and make it easy for them to leave a review — more reviews, less manual follow-up.",
      "Interested in getting this going?",
    ],
  },
  {
    key: 'upsell_local_seo',
    category: 'Upsells',
    name: 'Local SEO / Google Business Profile',
    subject: 'Show Up Where Local Homeowners Are Searching',
    description: 'Pitches local SEO / Google Business Profile optimization.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can optimize your Google Business Profile and local search presence so more homeowners in {{lead.city}} find {{contractor.name}} first.",
      "Want a quick rundown of what that involves?",
    ],
  },
  {
    key: 'upsell_brochure_sales_materials',
    category: 'Upsells',
    name: 'Brochure & Sales Materials',
    subject: 'Professional Sales Materials for Your Business',
    description: 'Pitches branded brochures/sales collateral.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can put together professional brochures and sales materials for {{contractor.name}} — great for in-home estimates and closing more jobs.",
      "Want to see some samples?",
    ],
  },
  {
    key: 'upsell_logo_brand_identity',
    category: 'Upsells',
    name: 'Logo & Brand Identity',
    subject: 'Upgrade How Your Business Looks Everywhere',
    description: 'Pitches logo / brand identity work.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "A refreshed logo and brand identity for {{contractor.name}} can make a real difference in how homeowners perceive you — on your trucks, your site, and your estimates.",
      "Want to see a concept?",
    ],
  },
  {
    key: 'upsell_social_media_ad_creative',
    category: 'Upsells',
    name: 'Social Media Ad Creative',
    subject: 'Fresh Ad Creative Built for Your Business',
    description: 'Pitches social ad creative production.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We can produce fresh ad creative built specifically for {{contractor.name}} — designed to perform on social and keep your campaigns from going stale.",
      "Want a sample set?",
    ],
  },
  // ------------------------------------------------------------- Billing
  {
    key: 'billing_payment_confirmation',
    category: 'Billing',
    name: 'Payment Confirmation',
    subject: 'HomeQuote Payment Confirmed',
    description: 'Confirms a received payment. Amount/plan are placeholders until billing data is wired up — see lib/emails/variables.ts.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "This confirms your payment for {{contractor.name}} has been received.",
      'Amount: [Amount]\nPlan: [Plan Name]\nBilling frequency: [Monthly/Annual]',
    ],
  },
  {
    key: 'billing_subscription_started',
    category: 'Billing',
    name: 'Subscription Started',
    subject: 'Your HomeQuote Subscription Is Active',
    description: 'Confirms a new subscription is active.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Your HomeQuote subscription is now active for {{contractor.name}}. You're all set to start receiving booked appointments.",
    ],
    cta: PORTAL_CTA,
  },
  {
    key: 'billing_subscription_upgraded',
    category: 'Billing',
    name: 'Subscription Upgraded',
    subject: 'Your HomeQuote Plan Has Been Upgraded',
    description: 'Confirms a subscription upgrade.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Your plan for {{contractor.name}} has been upgraded to [Plan Name]. The new plan is active now.",
    ],
  },
  {
    key: 'billing_payment_failed',
    category: 'Billing',
    name: 'Payment Failed',
    subject: 'Action Needed — HomeQuote Billing',
    description: 'Helpful, non-aggressive notice about a failed payment.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "We weren't able to process your latest payment for {{contractor.name}}. No rush — just update your payment method when you get a chance so there's no interruption to your account.",
    ],
  },
  {
    key: 'billing_subscription_cancellation',
    category: 'Billing',
    name: 'Subscription Cancellation Confirmation',
    subject: 'Your HomeQuote Subscription Has Been Updated',
    description: 'Confirms a cancellation without implying data deletion.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "This confirms your HomeQuote subscription for {{contractor.name}} has been updated per your request. Your account and history remain available if you'd like to come back.",
    ],
  },
  {
    key: 'billing_addon_activated',
    category: 'Billing',
    name: 'Add-On Activated',
    subject: 'Your [Add-On] Is Now Active',
    description: 'Confirms an add-on/upsell has been activated on the account.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "[Add-On] is now active on your account for {{contractor.name}}. Let us know if you have any questions getting the most out of it.",
    ],
  },
  // ------------------------------------------------------------- Reporting
  {
    key: 'reporting_monthly_performance',
    category: 'Reporting',
    name: 'Monthly Performance Summary',
    subject: 'Your HomeQuote Monthly Results',
    description: 'Monthly results summary. Report.* fields require the analytics rollup — see description on send.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Here's how {{contractor.name}} performed last month:",
      'Leads: [Leads]\nAppointments: [Appointments]\nShow rate: [Show Rate]\nEstimates: [Estimates]\nWon jobs: [Won Jobs]\nClose rate: [Close Rate]',
    ],
  },
  {
    key: 'reporting_weekly_performance',
    category: 'Reporting',
    name: 'Weekly Performance Summary',
    subject: 'Your HomeQuote Weekly Results',
    description: 'Weekly results summary.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Here's your weekly summary for {{contractor.name}}:",
      'Leads: [Leads]\nAppointments: [Appointments]\nShow rate: [Show Rate]',
    ],
  },
  {
    key: 'reporting_lead_delivery_summary',
    category: 'Reporting',
    name: 'Lead Delivery Summary',
    subject: 'HomeQuote Lead Activity Summary',
    description: 'Summarizes recent lead delivery activity.',
    contractorVisible: false,
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "A quick summary of recent lead activity for {{contractor.name}}: [Leads] leads delivered, [Appointments] appointments booked.",
    ],
  },
  // ------------------------------------------------------------- Internal Notifications
  {
    key: 'internal_new_lead_alert',
    category: 'Internal Notifications',
    name: 'New Lead Internal Alert',
    subject: 'New HomeQuote Lead — {{lead.service_type}} — {{lead.city}}',
    description: 'Internal alert to the HomeQuote team when a new lead comes in.',
    contractorVisible: false,
    paragraphs: [
      'New lead received.',
      'Name: {{lead.full_name}}\nService: {{lead.service_type}}\nCity: {{lead.city}}\nPhone: {{lead.phone}}\nEmail: {{lead.email}}\nProject: {{lead.project_description}}',
    ],
  },
  {
    key: 'internal_new_upsell_request',
    category: 'Internal Notifications',
    name: 'New Upsell Request',
    subject: 'New HomeQuote Upsell Request — {{lead.service_type}}',
    description: 'Internal alert when a contractor requests an upsell/add-on.',
    contractorVisible: false,
    paragraphs: [
      'A contractor has requested an add-on.',
      'Contractor: {{contractor.name}}\nContact: {{contractor.contact_name}}\nPhone: {{contractor.phone}}',
    ],
  },
  {
    key: 'internal_failed_workflow_alert',
    category: 'Internal Notifications',
    name: 'Failed Workflow Alert',
    subject: 'Workflow Failure — [Workflow Name]',
    description: 'Internal alert when a workflow run fails.',
    contractorVisible: false,
    paragraphs: [
      'A workflow run failed and needs attention.',
      'Workflow: [Workflow Name]\nLead: {{lead.full_name}}\nError: [Error Detail]',
    ],
  },
  {
    key: 'internal_payment_failure_alert',
    category: 'Internal Notifications',
    name: 'Payment Failure Internal Alert',
    subject: 'Contractor Billing Issue — {{contractor.name}}',
    description: 'Internal alert when a contractor payment fails.',
    contractorVisible: false,
    paragraphs: [
      'A contractor payment failed.',
      'Contractor: {{contractor.name}}\nContact: {{contractor.contact_name}}\nPhone: {{contractor.phone}}',
    ],
  },
];

export interface EmailTemplateSeedRow {
  key: string;
  category: string;
  name: string;
  subject: string;
  description: string;
  html_body: string;
  text_body: string;
  variables: string[];
  contractor_visible: boolean;
  is_system: true;
  is_active: true;
}

/** Renders the seed library into DB-ready rows using the shared branded shell. */
export function buildEmailTemplateSeedRows(siteUrl: string): EmailTemplateSeedRow[] {
  const logoUrl = emailLogoUrl(siteUrl);
  return EMAIL_TEMPLATE_LIBRARY.map((seed) => {
    const html_body = buildBrandedEmailHtml(seed.paragraphs, {
      logoUrl,
      ctaText: seed.cta?.text,
      ctaUrl: seed.cta?.url,
    });
    const text_body = buildBrandedEmailText(seed.paragraphs);
    const variables = Array.from(
      new Set([...variablesIn(seed.subject), ...variablesIn(seed.paragraphs.join('\n')), ...(seed.cta ? variablesIn(seed.cta.url) : [])])
    );
    return {
      key: seed.key,
      category: seed.category,
      name: seed.name,
      subject: seed.subject,
      description: seed.description,
      html_body,
      text_body,
      variables,
      contractor_visible: seed.contractorVisible,
      is_system: true,
      is_active: true,
    };
  });
}

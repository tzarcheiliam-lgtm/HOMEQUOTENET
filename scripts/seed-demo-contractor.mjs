// Node 24: node --env-file=.env.local scripts/seed-demo-contractor.mjs [--dry-run] [--name "Test Contractor"]
//
// Fills the demo contractor account ("Test Contractor" by default) with
// realistic placeholder data so a prospect watching a walkthrough sees a
// lived-in CRM: leads at every stage, appointments, estimates, sales, billing
// and activity. See HOMEQUOTE_CONTEXT.md.
//
// Safety:
//  - Aborts unless exactly ONE contractor matches the name.
//  - Everything it creates is tagged (leads.consent_source = 'demo-seed',
//    billing/sales notes start with 'demo-seed'). Re-running first deletes only
//    those tagged rows for this contractor, then re-creates them (idempotent).
//  - Fake data only: example.com emails, 555-01xx phone numbers.
//  - The DB triggers on these tables enqueue workflow_events; those rows are
//    deleted in the same transaction, so no email/SMS/push workflow fires for
//    demo data.
//  - --dry-run runs everything then ROLLS BACK.
//
// Run by a person with SUPABASE_DB_URL (writes production tables directly, like
// scripts/seed-pool-masters-ack-workflow.mjs).

import pg from 'pg';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const nameArg = args.indexOf('--name');
const NAME = nameArg >= 0 ? args[nameArg + 1] : 'Test Contractor';
const TAG = 'demo-seed';

const daysAgo = (d, hour = 10) => `now() - interval '${d} days' + interval '${hour - 10} hours'`;
const daysAhead = (d, hour = 10) => `now() + interval '${d} days' + interval '${hour - 10} hours'`;

// [first, last, street, city, zip, source, campaign, project, budget, jobValue, ageDays, stage]
const LEADS = [
  ['Maria', 'Gonzalez', '1423 Oakwood Dr', 'Woodland Hills', '91364', 'meta', 'Spring Remodel – LA', 'Full backyard remodel with new plaster and tile', '$40k–$60k', 52000, 3, 'assigned'],
  ['James', 'Whitfield', '88 Ridgeview Ln', 'Sherman Oaks', '91403', 'google', 'Pool Remodel Search', 'Resurface pool and replace coping', '$25k–$40k', 31000, 4, 'assigned'],
  ['Priya', 'Natarajan', '2210 Mulholland Hwy', 'Calabasas', '91302', 'meta', 'Spring Remodel – LA', 'Add spa and new equipment pad', '$60k+', 68000, 6, 'accepted'],
  ['Derek', 'Olsen', '640 Lindley Ave', 'Tarzana', '91356', 'website', null, 'Replace pool pump and heater', '$5k–$10k', 7800, 7, 'contacted'],
  ['Alicia', 'Ramirez', '17 Sunnybrook Ct', 'Encino', '91316', 'referral', null, 'Pool leak detection and repair', '$5k–$10k', 6400, 9, 'contacted'],
  ['Tom', 'Becker', '905 Topanga Canyon Blvd', 'Topanga', '90290', 'meta', 'Spring Remodel – LA', 'New pool with raised spa', '$80k+', 94000, 10, 'appointment_set'],
  ['Hannah', 'Lee', '3301 Valley Vista Blvd', 'Sherman Oaks', '91423', 'google', 'Pool Remodel Search', 'Pool deck resurfacing', '$10k–$20k', 14500, 12, 'appointment_set'],
  ['Robert', 'Castillo', '51 Calle Vista', 'Thousand Oaks', '91360', 'meta', 'Backyard Makeover', 'Complete backyard renovation', '$60k+', 71000, 14, 'appointment_set'],
  ['Sophie', 'Marchand', '732 Cheltenham Rd', 'Santa Monica', '90402', 'website', null, 'Pool tile and plaster refresh', '$15k–$25k', 19500, 18, 'appointment_held'],
  ['Marcus', 'Bell', '2468 Hollyridge Dr', 'Los Angeles', '90068', 'google', 'Pool Remodel Search', 'Add LED lighting and automation', '$5k–$10k', 8200, 20, 'appointment_held'],
  ['Elena', 'Petrov', '19 Palm Terrace', 'Pasadena', '91101', 'meta', 'Backyard Makeover', 'Pool remodel with swim-up bar', '$80k+', 87000, 22, 'estimate_given'],
  ['Kevin', 'Tran', '4410 Ventura Blvd', 'Sherman Oaks', '91423', 'referral', null, 'Replace pool surface and waterline tile', '$20k–$30k', 24500, 25, 'estimate_given'],
  ['Natalie', 'Brooks', '1180 Camino Real', 'Westlake Village', '91361', 'meta', 'Spring Remodel – LA', 'Resurface + new pool cover', '$20k–$30k', 26000, 28, 'estimate_given'],
  ['Carlos', 'Mendoza', '300 Magnolia Blvd', 'Burbank', '91505', 'google', 'Pool Remodel Search', 'Full pool remodel with new equipment', '$40k–$60k', 48500, 33, 'sold'],
  ['Jennifer', 'Wu', '725 Hillcrest Rd', 'Beverly Hills', '90210', 'referral', null, 'Luxury pool and spa build', '$100k+', 128000, 38, 'sold'],
  ['Brian', 'Hayes', '56 Meadow Lark Ln', 'Agoura Hills', '91301', 'meta', 'Backyard Makeover', 'Pool resurfacing and new coping', '$15k–$25k', 21000, 42, 'sold'],
  ['Angela', 'Rossi', '1902 Ocean Park Blvd', 'Santa Monica', '90405', 'website', null, 'Spa remodel', '$10k–$20k', 16800, 47, 'sold'],
  ['Daniel', 'Kim', '88 Sycamore Way', 'Glendale', '91206', 'google', 'Pool Remodel Search', 'Pool replaster', '$10k–$20k', 12500, 55, 'sold'],
  ['Olivia', 'Grant', '4200 Laurel Canyon Blvd', 'Studio City', '91604', 'meta', 'Spring Remodel – LA', 'Add water feature and lighting', '$10k–$20k', 15500, 36, 'lost'],
  ['Victor', 'Alvarez', '812 Rose Ave', 'Venice', '90291', 'google', 'Pool Remodel Search', 'Pool resurfacing', '$10k–$20k', 11800, 44, 'lost'],
  ['Samantha', 'Cole', '27 Brookside Cir', 'Westlake Village', '91362', 'website', null, 'Pool remodel', '$40k–$60k', 45000, 58, 'lost'],
  ['Greg', 'Sullivan', '1550 Moorpark St', 'Sherman Oaks', '91423', 'meta', 'Backyard Makeover', 'New pool', '$60k+', 66000, 2, 'assigned'],
  ['Tasha', 'Williams', '902 Fairfax Ave', 'Los Angeles', '90036', 'google', 'Pool Remodel Search', 'Leak repair and re-plaster', '$10k–$20k', 13200, 5, 'accepted'],
  ['Ian', 'Murphy', '33 Vista del Mar', 'Malibu', '90265', 'referral', null, 'Pool and spa remodel', '$100k+', 142000, 16, 'appointment_set'],
];

const STAGE = {
  assigned:         { lead: 'assigned',              assignment: 'assigned' },
  accepted:         { lead: 'assigned',              assignment: 'accepted' },
  contacted:        { lead: 'contact_attempted',     assignment: 'contacted' },
  appointment_set:  { lead: 'appointment_set',       assignment: 'appointment_set' },
  appointment_held: { lead: 'appointment_completed', assignment: 'appointment_held' },
  estimate_given:   { lead: 'estimate_sent',         assignment: 'estimate_given' },
  sold:             { lead: 'sold',                  assignment: 'sold' },
  lost:             { lead: 'lost',                  assignment: 'lost' },
};

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const { rows: matches } = await db.query(`select id, name from public.contractors where name ilike $1`, [`%${NAME}%`]);
  if (matches.length !== 1) throw new Error(`Expected exactly one contractor matching "${NAME}", found ${matches.length}: ${matches.map(m => m.name).join(', ') || '(none)'}. Pass --name "<exact name>".`);
  const contractor = matches[0];
  console.log(`Seeding demo data for contractor "${contractor.name}" (${contractor.id})${DRY ? ' [dry run]' : ''}`);

  await db.query('begin');

  // Vertical: the contractor's own, else any active one.
  const { rows: [vertical] } = await db.query(
    `select v.id from public.verticals v left join public.contractor_verticals cv on cv.vertical_id = v.id and cv.contractor_id = $1
     where v.is_active order by (cv.contractor_id is not null) desc, v.created_at limit 1`, [contractor.id]);
  if (!vertical) throw new Error('No active vertical exists to attach demo leads to.');

  // Make the account look complete.
  await db.query(
    `update public.contractors set status = 'active',
       contact_name = coalesce(contact_name, 'Alex Demo'), email = coalesce(email, 'alex@testcontractor.example.com'),
       phone = coalesce(phone, '(818) 555-0100'),
       service_areas = case when cardinality(service_areas) = 0 then array['91364','91403','91302','91356','91316','90290','91360','91423','90402','91101'] else service_areas end
     where id = $1`, [contractor.id]);

  // Clear previous demo rows (only ours). leads cascade to assignments/appointments/estimates/sales/activities.
  await db.query(`delete from public.billing_events where contractor_id = $1 and notes like $2`, [contractor.id, `${TAG}%`]);
  await db.query(
    `delete from public.leads l where l.consent_source = $2
       and exists (select 1 from public.lead_assignments a where a.lead_id = l.id and a.contractor_id = $1)
       and not exists (select 1 from public.lead_assignments a where a.lead_id = l.id and a.contractor_id <> $1)`, [contractor.id, TAG]);

  // A pricing agreement to hang billing on (reuse the contractor's active one if present).
  let { rows: [pricing] } = await db.query(
    `select id, per_lead_amount from public.pricing_agreements where contractor_id = $1 and is_active order by created_at limit 1`, [contractor.id]);
  if (!pricing) {
    ({ rows: [pricing] } = await db.query(
      `insert into public.pricing_agreements (contractor_id, vertical_id, model, per_lead_amount, per_appointment_amount, is_exclusive, notes)
       values ($1, $2, 'hybrid', 40, 150, false, $3) returning id, per_lead_amount`, [contractor.id, vertical.id, `${TAG}: demo pricing`]));
  }
  const leadFee = Number(pricing.per_lead_amount ?? 40);

  const leadIds = [];
  let sales = 0, wonTotal = 0;
  for (const [first, last, street, city, zip, source, campaign, project, budget, value, age, stage] of LEADS) {
    const st = STAGE[stage];
    const idx = leadIds.length;
    const slug = `${first}.${last}`.toLowerCase();
    const { rows: [lead] } = await db.query(
      `insert into public.leads (vertical_id, status, first_name, last_name, email, phone, address, city, state, zip, project_description,
         estimated_job_value, qualified, qualified_at, qualification_status, budget_range, timeline, urgency, source, campaign, platform,
         consent_granted, consent_at, consent_source, lead_cost, notes, created_at, last_contact_date)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'CA',$9,$10,$11,true,${daysAgo(age)},'qualified',$12,$13,$14,$15,$16,$17,true,${daysAgo(age)},$18,$19,$20,${daysAgo(age)},${stage === 'assigned' ? 'null' : daysAgo(Math.max(age - 1, 0))})
       returning id`,
      [vertical.id, st.lead, first, last, `${slug}@example.com`, `(818) 555-01${String(idx + 10).padStart(2, '0')}`, street, city, zip, project,
       value, budget, idx % 3 === 0 ? 'ASAP' : idx % 3 === 1 ? '1–3 months' : 'Planning ahead', idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
       source, campaign, source === 'meta' ? 'facebook' : source === 'google' ? 'google' : null, TAG, leadFee,
       'Demo lead – placeholder data.']);
    leadIds.push(lead.id);

    const { rows: [asg] } = await db.query(
      `insert into public.lead_assignments (lead_id, contractor_id, pricing_agreement_id, status, assigned_at)
       values ($1,$2,$3,$4,${daysAgo(age)}) returning id`, [lead.id, contractor.id, pricing.id, st.assignment]);

    // Appointments.
    if (stage === 'appointment_set') {
      await db.query(`insert into public.appointments (assignment_id, scheduled_at, status, location, notes) values ($1, ${daysAhead((idx % 5) + 1, 9 + (idx % 6))}, 'scheduled', $2, 'Site visit and measurements')`, [asg.id, `${street}, ${city} CA ${zip}`]);
    } else if (['appointment_held', 'estimate_given', 'sold'].includes(stage) || (stage === 'lost' && idx % 2 === 0)) {
      await db.query(`insert into public.appointments (assignment_id, scheduled_at, status, location, notes) values ($1, ${daysAgo(Math.max(age - 4, 1), 14)}, 'held', $2, 'Site visit completed')`, [asg.id, `${street}, ${city} CA ${zip}`]);
    }
    // Estimates.
    if (['estimate_given', 'sold', 'lost'].includes(stage) && !(stage === 'lost' && idx % 2 !== 0)) {
      const status = stage === 'sold' ? 'accepted' : stage === 'lost' ? 'rejected' : 'sent';
      await db.query(`insert into public.estimates (assignment_id, amount, status, estimate_date, notes) values ($1,$2,$3,(now() - interval '${Math.max(age - 6, 1)} days')::date,'Demo estimate')`, [asg.id, value, status]);
    }
    // Sales.
    if (stage === 'sold') {
      const closeAge = Math.max(age - 10, 1);
      await db.query(
        `insert into public.sales (assignment_id, amount, closed_at, sale_date, sale_status, notes)
         values ($1,$2,(now() - interval '${closeAge} days')::date,(now() - interval '${closeAge} days')::date,'won',$3)`, [asg.id, value, `${TAG}: demo sale`]);
      sales++; wonTotal += value;
    }
    // Billing: a lead fee for each lead (older ones paid, middle invoiced, newest pending).
    const billStatus = age > 30 ? 'paid' : age > 12 ? 'invoiced' : 'pending';
    await db.query(
      `insert into public.billing_events (assignment_id, contractor_id, pricing_agreement_id, event_type, amount, amount_paid, status, occurred_at, due_date, notes)
       values ($1,$2,$3,'lead_fee',$4,$5,$6,${daysAgo(age)},(now() - interval '${age} days' + interval '30 days')::date,$7)`,
      [asg.id, contractor.id, pricing.id, leadFee, billStatus === 'paid' ? leadFee : 0, billStatus, `${TAG}: lead fee`]);

    // Activity timeline.
    await db.query(`insert into public.lead_activities (lead_id, type, body, created_at) values ($1,'assignment',$2,${daysAgo(age)})`, [lead.id, `Lead assigned to ${contractor.name}`]);
    if (stage !== 'assigned') await db.query(`insert into public.lead_activities (lead_id, type, body, created_at) values ($1,'contact_attempt',$2,${daysAgo(Math.max(age - 1, 0))})`, [lead.id, 'Called homeowner and discussed the project scope.']);
    if (['appointment_held', 'estimate_given', 'sold'].includes(stage)) await db.query(`insert into public.lead_activities (lead_id, type, body, created_at) values ($1,'note',$2,${daysAgo(Math.max(age - 4, 0))})`, [lead.id, 'Great visit – homeowner wants to move forward soon.']);
  }

  // The triggers on these tables enqueued workflow events; drop them so no workflow
  // (email/SMS/push) reacts to demo data. Nothing has dispatched yet (same transaction).
  const { rowCount: dropped } = await db.query(`delete from public.workflow_events where lead_id = any($1::uuid[])`, [leadIds]);

  if (DRY) { await db.query('rollback'); console.log('Dry run complete — rolled back.'); }
  else { await db.query('commit'); console.log('Committed.'); }
  console.log(`${leadIds.length} leads, ${sales} won sales ($${wonTotal.toLocaleString()}), ${dropped} workflow events discarded.`);
} catch (err) {
  await db.query('rollback').catch(() => {});
  console.error('Seed failed, nothing was written:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEMO_TAG = 'demo-seed';

type Stage = 'assigned' | 'accepted' | 'contacted' | 'appointment_set' | 'appointment_held' | 'estimate_given' | 'sold' | 'lost';
// [first, last, street, city, zip, source, campaign, project, budget, jobValue, ageDays, stage]
type DemoLead = [string, string, string, string, string, string, string | null, string, string, number, number, Stage];

const LEADS: DemoLead[] = [
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

const STAGE: Record<Stage, { lead: string; assignment: string }> = {
  assigned:         { lead: 'assigned',              assignment: 'assigned' },
  accepted:         { lead: 'assigned',              assignment: 'accepted' },
  contacted:        { lead: 'contact_attempted',     assignment: 'contacted' },
  appointment_set:  { lead: 'appointment_set',       assignment: 'appointment_set' },
  appointment_held: { lead: 'appointment_completed', assignment: 'appointment_held' },
  estimate_given:   { lead: 'estimate_sent',         assignment: 'estimate_given' },
  sold:             { lead: 'sold',                  assignment: 'sold' },
  lost:             { lead: 'lost',                  assignment: 'lost' },
};

const DAY = 86_400_000;
const ago = (days: number, hour = 10) => new Date(Date.now() - days * DAY + (hour - 10) * 3_600_000).toISOString();
const ahead = (days: number, hour = 10) => new Date(Date.now() + days * DAY + (hour - 10) * 3_600_000).toISOString();
const dateOnly = (iso: string) => iso.slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must(res: { data: any; error: { message: string } | null }, what: string): any {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

/**
 * Fills a contractor account with placeholder leads, appointments, estimates, sales,
 * billing and activity for sales walkthroughs. Idempotent: it tags what it creates
 * (leads.consent_source = DEMO_TAG, billing/sales notes start with DEMO_TAG) and only
 * ever deletes those tagged rows. Fake contact data only. The workflow events the table
 * triggers enqueue are deleted straight after, so no email/SMS/push workflow reacts.
 */
export async function seedDemoContractor(db: SupabaseClient, contractorId: string) {
  // Clear previous demo rows (leads cascade to assignments/appointments/estimates/sales/activities).
  await db.from('billing_events').delete().eq('contractor_id', contractorId).like('notes', `${DEMO_TAG}%`);
  const { data: old } = await db.from('leads').select('id, lead_assignments!inner(contractor_id)').eq('consent_source', DEMO_TAG).eq('lead_assignments.contractor_id', contractorId);
  const oldIds = (old ?? []).map(l => l.id as string);
  if (oldIds.length) must(await db.from('leads').delete().in('id', oldIds).select('id'), 'clear previous demo leads');

  // Vertical: the contractor's own, else any active one.
  const own = must(await db.from('contractor_verticals').select('vertical_id').eq('contractor_id', contractorId).limit(1), 'verticals');
  let verticalId = own?.[0]?.vertical_id as string | undefined;
  if (!verticalId) {
    const any = must(await db.from('verticals').select('id').eq('is_active', true).order('created_at').limit(1), 'verticals');
    verticalId = any?.[0]?.id;
  }
  if (!verticalId) throw new Error('No active vertical exists to attach demo leads to.');

  // Make the profile look complete without overwriting anything already set.
  const c = must(await db.from('contractors').select('contact_name, email, phone, service_areas, name').eq('id', contractorId).single(), 'contractor');
  must(await db.from('contractors').update({
    status: 'active',
    contact_name: c.contact_name ?? 'Alex Demo',
    email: c.email ?? 'alex@testcontractor.example.com',
    phone: c.phone ?? '(818) 555-0100',
    service_areas: c.service_areas?.length ? c.service_areas : ['91364', '91403', '91302', '91356', '91316', '90290', '91360', '91423', '90402', '91101'],
  }).eq('id', contractorId).select('id'), 'update contractor');

  // A pricing agreement to hang billing on (reuse the contractor's active one if present).
  let pricing = must(await db.from('pricing_agreements').select('id, per_lead_amount').eq('contractor_id', contractorId).eq('is_active', true).order('created_at').limit(1), 'pricing')?.[0];
  if (!pricing) {
    pricing = must(await db.from('pricing_agreements').insert({ contractor_id: contractorId, vertical_id: verticalId, model: 'hybrid', per_lead_amount: 40, per_appointment_amount: 150, notes: `${DEMO_TAG}: demo pricing` }).select('id, per_lead_amount').single(), 'create pricing');
  }
  const leadFee = Number(pricing.per_lead_amount ?? 40);

  // Leads.
  const leadRows = LEADS.map(([first, last, street, city, zip, source, campaign, project, budget, value, age, stage], idx) => ({
    vertical_id: verticalId, status: STAGE[stage].lead, first_name: first, last_name: last,
    email: `${first}.${last}`.toLowerCase() + '@example.com', phone: `(818) 555-01${String(idx + 10).padStart(2, '0')}`,
    address: street, city, state: 'CA', zip, project_description: project, estimated_job_value: value,
    qualified: true, qualified_at: ago(age), qualification_status: 'qualified', budget_range: budget,
    timeline: idx % 3 === 0 ? 'ASAP' : idx % 3 === 1 ? '1–3 months' : 'Planning ahead', urgency: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
    source, campaign, platform: source === 'meta' ? 'facebook' : source === 'google' ? 'google' : null,
    consent_granted: true, consent_at: ago(age), consent_source: DEMO_TAG, lead_cost: leadFee,
    notes: 'Demo lead – placeholder data.', created_at: ago(age), last_contact_date: stage === 'assigned' ? null : ago(Math.max(age - 1, 0)),
  }));
  const leads = must(await db.from('leads').insert(leadRows).select('id, created_at'), 'insert leads');
  // Insert returns rows in insert order.
  const leadIds = leads.map((l: { id: string }) => l.id);

  const asgs = must(await db.from('lead_assignments').insert(LEADS.map(([, , , , , , , , , , age, stage], i) => ({
    lead_id: leadIds[i], contractor_id: contractorId, pricing_agreement_id: pricing.id, status: STAGE[stage].assignment, assigned_at: ago(age),
  }))).select('id, lead_id'), 'insert assignments');
  const asgId = (i: number) => asgs.find((a: { id: string; lead_id: string }) => a.lead_id === leadIds[i])!.id as string;

  const appointments: Record<string, unknown>[] = [], estimates: Record<string, unknown>[] = [], sales: Record<string, unknown>[] = [],
    billing: Record<string, unknown>[] = [], activities: Record<string, unknown>[] = [];
  let wonTotal = 0;
  LEADS.forEach(([, , street, city, zip, , , , , value, age, stage], i) => {
    const assignment_id = asgId(i), location = `${street}, ${city} CA ${zip}`;
    if (stage === 'appointment_set') appointments.push({ assignment_id, scheduled_at: ahead((i % 5) + 1, 9 + (i % 6)), status: 'scheduled', location, notes: 'Site visit and measurements' });
    else if (['appointment_held', 'estimate_given', 'sold'].includes(stage) || (stage === 'lost' && i % 2 === 0)) appointments.push({ assignment_id, scheduled_at: ago(Math.max(age - 4, 1), 14), status: 'held', location, notes: 'Site visit completed' });
    if (['estimate_given', 'sold'].includes(stage) || (stage === 'lost' && i % 2 === 0)) {
      estimates.push({ assignment_id, amount: value, status: stage === 'sold' ? 'accepted' : stage === 'lost' ? 'rejected' : 'sent', estimate_date: dateOnly(ago(Math.max(age - 6, 1))), notes: 'Demo estimate' });
    }
    if (stage === 'sold') {
      const closed = dateOnly(ago(Math.max(age - 10, 1)));
      sales.push({ assignment_id, amount: value, closed_at: closed, sale_date: closed, sale_status: 'won', notes: `${DEMO_TAG}: demo sale` });
      wonTotal += value;
    }
    const status = age > 30 ? 'paid' : age > 12 ? 'invoiced' : 'pending';
    billing.push({ assignment_id, contractor_id: contractorId, pricing_agreement_id: pricing.id, event_type: 'lead_fee', amount: leadFee, amount_paid: status === 'paid' ? leadFee : 0, status, occurred_at: ago(age), due_date: dateOnly(ago(age - 30)), notes: `${DEMO_TAG}: lead fee` });
    activities.push({ lead_id: leadIds[i], type: 'assignment', body: `Lead assigned to ${c.name}`, created_at: ago(age) });
    if (stage !== 'assigned') activities.push({ lead_id: leadIds[i], type: 'contact_attempt', body: 'Called homeowner and discussed the project scope.', created_at: ago(Math.max(age - 1, 0)) });
    if (['appointment_held', 'estimate_given', 'sold'].includes(stage)) activities.push({ lead_id: leadIds[i], type: 'note', body: 'Great visit – homeowner wants to move forward soon.', created_at: ago(Math.max(age - 4, 0)) });
  });
  for (const [table, rows] of [['appointments', appointments], ['estimates', estimates], ['sales', sales], ['billing_events', billing], ['lead_activities', activities]] as const) {
    must(await db.from(table).insert(rows).select('id'), `insert ${table}`);
  }

  // Drop the workflow events the insert triggers just enqueued so nothing reacts to demo data.
  await db.from('workflow_events').delete().in('lead_id', leadIds);

  return { leads: leadIds.length, sales: sales.length, wonTotal };
}

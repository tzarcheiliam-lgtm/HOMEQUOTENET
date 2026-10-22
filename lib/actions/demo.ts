'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { seedDemoContractor } from '@/lib/demo/seed-contractor';

/** Admin-only. Refuses any contractor whose name doesn't contain "test" or "demo" so real accounts can't be polluted. */
export async function loadDemoData(formData: FormData) {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  const db = createAdminClient();
  const { data: contractor } = await db.from('contractors').select('id, name').eq('id', id).maybeSingle();
  if (!contractor) redirect('/app/contractors');
  if (!/test|demo/i.test(contractor.name)) redirect(`/app/contractors/${id}?demo=refused`);
  await seedDemoContractor(db, id);
  revalidatePath('/app', 'layout');
  redirect(`/app/contractors/${id}?demo=loaded`);
}

import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

/**
 * Returns the current user's profile (including role), or null if not signed in.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (profile as Profile) ?? null;
}

/**
 * Requires a signed-in, active user. Redirects to /sign-in otherwise, or to a
 * "pending activation" page if the account exists but an admin hasn't enabled it.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/sign-in');
  if (!profile.is_active) redirect('/pending');
  return profile;
}

/**
 * Requires a signed-in active user whose role is in the allowed list.
 */
export async function requireRole(
  roles: Profile['role'][]
): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect('/app');
  return profile;
}

/**
 * The calling workspace is for the people who work a prospect call list —
 * callers and appointment setters — plus the admins who run them. A
 * contractor is sent back to their own home; they should never learn the
 * workspace exists.
 *
 * This only decides who gets through the door. Everything inside still
 * separates admin from call agent: a non-admin sees only the prospects
 * assigned to them, and admin-only controls (Refresh Prospects, assignment,
 * lifting a do-not-call) keep their own `requireRole(['admin'])` guards.
 */
export async function requireCallWorkspace(): Promise<Profile> {
  return requireRole(['admin', 'caller', 'setter']);
}

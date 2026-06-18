import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Supabase client that uses the service-role key.
 * This BYPASSES Row Level Security, so it must ONLY be used in trusted
 * server-side code for administrative actions (e.g. an admin creating a
 * contractor or staff account). Never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

'use server';

import { headers } from 'next/headers';
import {
  applicationSchema,
  type FieldErrors,
  type ApplicationInput,
} from '@/lib/validation/application';
import {
  deliverApplication,
  type ApplicationRecord,
} from '@/lib/applications/deliver';
import type { ApplicationState } from '@/lib/applications/state';
import { screenSubmission } from '@/lib/applications/spam';
import { categorizeError } from '@/lib/applications/redact';

/** Collects the submitted values so a failed submit does not lose the user's work. */
function echoValues(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (key === 'consent') continue;
    // Honeypot and timing fields never round-trip.
    if (key === 'company_url' || key === 'form_started_at') continue;

    if (key === 'primary_services') {
      const existing = out[key];
      out[key] = Array.isArray(existing) ? [...existing, value] : [value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function submitApplication(
  _prev: ApplicationState,
  formData: FormData
): Promise<ApplicationState> {
  const values = echoValues(formData);

  /* ---- Spam protection ------------------------------------------------- */

  // `company_url` is a honeypot hidden from people; `form_started_at` catches
  // submissions faster than a person could type. When either trips we return a
  // generic success so an automated submitter learns nothing from the response.
  const screen = screenSubmission({
    honeypot: formData.get('company_url'),
    startedAt: formData.get('form_started_at'),
  });

  if (screen.spam) {
    console.warn(
      `[contractor-application] discarded — spam check: ${screen.reason}`
    );
    return {
      status: 'success',
      message: 'Application received.',
      fieldErrors: {},
      values: {},
    };
  }

  /* ---- Validation ------------------------------------------------------ */

  const parsed = applicationSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    company: formData.get('company'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    website: formData.get('website'),
    primary_services: formData.getAll('primary_services'),
    service_areas: formData.get('service_areas'),
    avg_project_value: formData.get('avg_project_value'),
    min_project_size: formData.get('min_project_size'),
    monthly_lead_capacity: formData.get('monthly_lead_capacity'),
    response_time: formData.get('response_time'),
    uses_crm: formData.get('uses_crm'),
    track: formData.get('track'),
    notes: formData.get('notes'),
    consent: formData.get('consent') ?? false,
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ApplicationInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: 'error',
      message: 'Please check the highlighted fields and try again.',
      fieldErrors,
      values,
    };
  }

  /* ---- Delivery -------------------------------------------------------- */

  const headerList = await headers();
  const record: ApplicationRecord = {
    ...parsed.data,
    submitted_at: new Date().toISOString(),
    source_page: headerList.get('referer'),
    user_agent: headerList.get('user-agent'),
  };

  let result;
  try {
    result = await deliverApplication(record);
  } catch (err) {
    /*
      Never log `err` or the record directly here. A thrown delivery error can
      carry a webhook URL, a connection string or a bearer token, and the record
      carries the applicant's contact details. Both stay out of the log.
    */
    console.error(
      '[contractor-application] unexpected delivery error',
      JSON.stringify({
        error_category: categorizeError(
          err instanceof Error ? err.message : String(err)
        ),
        company: record.company,
        submitted_at: record.submitted_at,
      })
    );
    return {
      status: 'error',
      message:
        'Something went wrong on our end and your application was not submitted. Please try again in a moment.',
      fieldErrors: {},
      values,
    };
  }

  if (!result.ok) {
    return {
      status: 'error',
      message:
        'We could not submit your application just now. Please try again in a moment.',
      fieldErrors: {},
      values,
    };
  }

  return {
    status: 'success',
    message: 'Application received.',
    fieldErrors: {},
    values: {},
  };
}

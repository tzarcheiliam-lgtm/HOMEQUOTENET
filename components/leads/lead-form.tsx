'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BUDGET_RANGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  TIMELINE_OPTIONS,
  URGENCY_OPTIONS,
} from '@/lib/leads/constants';
import type { Lead, SubService, Vertical } from '@/lib/types';
import type { LeadFormState } from '@/lib/actions/leads';

type Action = (
  state: LeadFormState,
  formData: FormData
) => Promise<LeadFormState>;

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function LeadForm({
  action,
  lead,
  verticals,
  subServices,
  canEditEconomics,
  submitLabel,
}: {
  action: Action;
  lead?: Lead;
  verticals: Vertical[];
  subServices: SubService[];
  canEditEconomics: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    action,
    undefined
  );

  const [verticalId, setVerticalId] = useState(lead?.vertical_id ?? '');
  const filteredSubs = useMemo(
    () => subServices.filter((s) => s.vertical_id === verticalId),
    [subServices, verticalId]
  );

  return (
    <form action={formAction} className="space-y-6">
      {lead && <input type="hidden" name="id" value={lead.id} />}

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input name="first_name" defaultValue={lead?.first_name ?? ''} />
          </Field>
          <Field label="Last name">
            <Input name="last_name" defaultValue={lead?.last_name ?? ''} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={lead?.phone ?? ''} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={lead?.email ?? ''} />
          </Field>
        </CardContent>
      </Card>

      {/* Property */}
      <Card>
        <CardHeader>
          <CardTitle>Property information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" className="sm:col-span-2">
            <Input name="address" defaultValue={lead?.address ?? ''} />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={lead?.city ?? ''} />
          </Field>
          <Field label="State">
            <Input name="state" defaultValue={lead?.state ?? ''} />
          </Field>
          <Field label="ZIP">
            <Input name="zip" defaultValue={lead?.zip ?? ''} />
          </Field>
        </CardContent>
      </Card>

      {/* Service */}
      <Card>
        <CardHeader>
          <CardTitle>Service information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Vertical">
            <Select
              name="vertical_id"
              value={verticalId}
              onChange={(e) => setVerticalId(e.target.value)}
            >
              <option value="">Select a vertical</option>
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sub-service">
            <Select
              name="sub_service_id"
              defaultValue={lead?.sub_service_id ?? ''}
              disabled={filteredSubs.length === 0}
            >
              <option value="">
                {filteredSubs.length === 0 ? 'None for this vertical' : 'Select'}
              </option>
              {filteredSubs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project description" className="sm:col-span-2">
            <Textarea
              name="project_description"
              defaultValue={lead?.project_description ?? ''}
            />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={lead?.status ?? 'new'}>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Qualification */}
      <Card>
        <CardHeader>
          <CardTitle>Qualification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Budget range">
            <Select name="budget_range" defaultValue={lead?.budget_range ?? ''}>
              <option value="">—</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Timeline">
            <Select name="timeline" defaultValue={lead?.timeline ?? ''}>
              <option value="">—</option>
              {TIMELINE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urgency">
            <Select name="urgency" defaultValue={lead?.urgency ?? ''}>
              <option value="">—</option>
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              name="qualified"
              defaultChecked={lead?.qualified ?? false}
              className="size-4 accent-primary"
            />
            Mark as qualified
          </label>
        </CardContent>
      </Card>

      {/* Economics (admin only) */}
      {canEditEconomics && (
        <Card>
          <CardHeader>
            <CardTitle>Lead economics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Lead cost ($)">
              <Input
                name="lead_cost"
                type="number"
                step="0.01"
                defaultValue={lead?.lead_cost ?? ''}
              />
            </Field>
            <Field label="Estimated job value ($)">
              <Input
                name="estimated_job_value"
                type="number"
                step="0.01"
                defaultValue={lead?.estimated_job_value ?? ''}
              />
            </Field>
            <Field label="Actual revenue ($)">
              <Input
                name="actual_revenue"
                type="number"
                step="0.01"
                defaultValue={lead?.actual_revenue ?? ''}
              />
            </Field>
            <Field label="Commission ($)">
              <Input
                name="commission"
                type="number"
                step="0.01"
                defaultValue={lead?.commission ?? ''}
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Profit is calculated automatically (revenue − lead cost − commission).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Marketing attribution */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing attribution</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead source">
            <Select name="source" defaultValue={lead?.source ?? ''}>
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Campaign name">
            <Input name="campaign" defaultValue={lead?.campaign ?? ''} />
          </Field>
          <Field label="Ad set name">
            <Input name="ad_set" defaultValue={lead?.ad_set ?? ''} />
          </Field>
          <Field label="Ad name">
            <Input name="ad_name" defaultValue={lead?.ad_name ?? ''} />
          </Field>
          <Field label="UTM source">
            <Input name="utm_source" defaultValue={lead?.utm_source ?? ''} />
          </Field>
          <Field label="UTM medium">
            <Input name="utm_medium" defaultValue={lead?.utm_medium ?? ''} />
          </Field>
          <Field label="UTM campaign">
            <Input name="utm_campaign" defaultValue={lead?.utm_campaign ?? ''} />
          </Field>
          <Field label="UTM content">
            <Input name="utm_content" defaultValue={lead?.utm_content ?? ''} />
          </Field>
          <Field label="UTM term">
            <Input name="utm_term" defaultValue={lead?.utm_term ?? ''} />
          </Field>
          <Field label="Landing page URL">
            <Input
              name="landing_page_url"
              defaultValue={lead?.landing_page_url ?? ''}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Sticky action bar — keeps Save reachable in this long form */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        {state?.error && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="mr-auto text-sm text-emerald-600">Saved.</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

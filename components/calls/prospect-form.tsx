'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createProspect, type ProspectActionState } from '@/lib/actions/prospects';
import type { CallerOption } from '@/lib/data/prospects';

/** Admin-only manual add. Bulk lists come in through the import script. */
export function ProspectForm({ callers }: { callers: CallerOption[] }) {
  const [state, formAction, pending] = useActionState<ProspectActionState, FormData>(
    createProspect,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="company_name" required className="sm:col-span-2">
            <Input id="company_name" name="company_name" required autoFocus />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="off" />
          </Field>
          <Field label="Website" htmlFor="website">
            <Input id="website" name="website" placeholder="example.com" autoComplete="off" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="off" />
          </Field>
          <Field label="Category" htmlFor="category">
            <Input id="category" name="category" placeholder="pool_remodeler" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market and services</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" />
          </Field>
          <Field label="County" htmlFor="county">
            <Input id="county" name="county" placeholder="Los Angeles" />
          </Field>
          <Field label="Service area" htmlFor="service_area" className="sm:col-span-2">
            <Input id="service_area" name="service_area" placeholder="San Fernando Valley, Conejo Valley" />
          </Field>
          <Field
            label="Primary services"
            htmlFor="primary_services"
            hint="Separate with commas."
            className="sm:col-span-2"
          >
            <Input
              id="primary_services"
              name="primary_services"
              placeholder="Pool remodeling, Resurfacing, Tile and coping"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment and notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign to" htmlFor="assigned_to">
            <Select id="assigned_to" name="assigned_to" defaultValue="">
              <option value="">Unassigned</option>
              {callers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        </CardContent>
      </Card>

      {state && !state.ok && state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create prospect'}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')}>
      <Label htmlFor={htmlFor}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

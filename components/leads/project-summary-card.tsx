import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLeadDescription, displayValue, humanizeToken } from '@/lib/leads/display';

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function ProjectSummaryCard({
  verticalName,
  subServiceName,
  budgetRange,
  timeline,
  zip,
  description,
}: {
  verticalName: string | null | undefined;
  subServiceName: string | null | undefined;
  budgetRange: string | null | undefined;
  timeline: string | null | undefined;
  zip: string | null | undefined;
  description: string | null | undefined;
}) {
  const parsed = parseLeadDescription(description);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SummaryField
            label="Project"
            value={displayValue(
              subServiceName ? `${verticalName ?? ''} · ${subServiceName}` : verticalName
            )}
          />
          <SummaryField label="Timeline" value={displayValue(timeline && humanizeToken(timeline))} />
          <SummaryField label="Budget" value={displayValue(budgetRange && humanizeToken(budgetRange))} />
          <SummaryField label="ZIP" value={displayValue(zip)} />
          {parsed.isStructured &&
            parsed.fields
              .filter((f) => !['zip', 'service', 'budget', 'timeline'].includes(f.key))
              .map((f) => <SummaryField key={f.key} label={f.label} value={f.value} />)}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Project description</p>
          {parsed.text ? (
            <p className="whitespace-pre-wrap text-sm">{parsed.text}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not provided</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

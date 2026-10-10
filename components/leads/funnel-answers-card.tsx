import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunnelAnswerSet } from '@/lib/data/lead-funnel-answers';

export function FunnelAnswersCard({ sets }: { sets: FunnelAnswerSet[] }) {
  if (!sets.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel answers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {sets.map((set, i) => (
          <div key={set.id}>
            {(sets.length > 1 || set.funnelName) && (
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {[set.funnelName, set.submittedAt ? new Date(set.submittedAt).toLocaleString() : null, sets.length > 1 && i === 0 ? 'latest' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <dl className="space-y-2">
              {set.items.map((it) => (
                <div key={it.question} className="rounded-lg bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{it.question}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm font-medium">{it.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

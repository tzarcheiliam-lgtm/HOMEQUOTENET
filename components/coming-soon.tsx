import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Placeholder for modules that are scaffolded but not yet implemented.
export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            {phase}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This module is part of the planned build-out. The data model and
          access rules already support it — the screens land in an upcoming
          phase.
        </CardContent>
      </Card>
    </div>
  );
}

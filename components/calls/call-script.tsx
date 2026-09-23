import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CALL_SCRIPT } from '@/lib/calls/constants';

/**
 * The call framework, laid out to be scanned mid-call: opener in one line,
 * the offer as four short beats, the six qualifying questions, then
 * objections as expandable rows so the panel stays short until one is needed.
 */
export function CallScript() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Call framework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Opener
          </h3>
          <p className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2 leading-6">
            &ldquo;{CALL_SCRIPT.opener}&rdquo;
          </p>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            The offer
          </h3>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-6">
            {CALL_SCRIPT.pitch.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ask
          </h3>
          <ul className="mt-1.5 space-y-1 leading-6">
            {CALL_SCRIPT.questions.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="select-none text-muted-foreground" aria-hidden="true">
                  &bull;
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Objections
          </h3>
          <div className="mt-1.5 divide-y rounded-md border">
            {CALL_SCRIPT.objections.map((o) => (
              <details key={o.objection} className="group">
                <summary className="cursor-pointer list-none px-3 py-2 font-medium marker:content-none hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                  {o.objection}
                </summary>
                <p className="px-3 pb-3 leading-6 text-muted-foreground">{o.response}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Close
          </h3>
          <p className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2 leading-6">
            &ldquo;{CALL_SCRIPT.close}&rdquo;
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

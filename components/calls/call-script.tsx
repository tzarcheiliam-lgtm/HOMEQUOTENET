import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CALL_SCRIPT, fillScript, splitPlaceholders, type ScriptVars } from '@/lib/calls/script';

/**
 * The cold-call script beside every call, laid out to be scanned mid-call:
 * the opener and pitch open, everything else (questions, close, objections,
 * prospect Q&A, gatekeeper, voicemail, text, rules) one tap away. The
 * contact, company, caller and trade are filled in; any [blank] still left is
 * highlighted so it is never read out loud.
 */
export function CallScript({ vars = {} }: { vars?: ScriptVars }) {
  const say = (text: string) => <Say text={fillScript(text, vars)} />;
  const s = CALL_SCRIPT;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Call script</CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Goal:</span> {s.goal}{' '}
          <span className="font-medium text-foreground">Offer:</span> {s.offer}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Section title="1. Opener" open>
          <ul className="space-y-2">
            {s.openers.map((o) => (
              <li key={o.label}>
                <p className="text-xs font-medium text-muted-foreground">{o.label}</p>
                <Quote>{say(o.text)}</Quote>
              </li>
            ))}
          </ul>
          <p className="font-medium">{s.afterOpener}</p>
        </Section>

        <Section title="2. “Sure / Go ahead / What do you do?”" open>
          <Quote>{say(s.pitch)}</Quote>
          <p className="text-xs font-medium text-muted-foreground">Then always end on a question:</p>
          <Quote>{say(s.pitchQuestion)}</Quote>
        </Section>

        <Section title="3. Qualify (2 to 3 max, listen)">
          <ul className="space-y-1">
            {s.qualify.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="select-none text-muted-foreground" aria-hidden="true">
                  &bull;
                </span>
                <span>&ldquo;{say(q)}&rdquo;</span>
              </li>
            ))}
          </ul>
          <p className="text-xs font-medium text-muted-foreground">ROI close-the-gap line:</p>
          <Quote>{say(s.roi)}</Quote>
        </Section>

        <Section title="4. Close (book the next step)">
          <Quote>{say(s.close)}</Quote>
          <p className="text-xs text-muted-foreground">{s.closeTip}</p>
        </Section>

        <Section title="5. Objections">
          <Answers items={s.objections} say={say} />
        </Section>

        <Section title="Prospect Q&A">
          <p className="text-xs text-muted-foreground">
            Answer in a sentence or two, then go back to booking the 10-minute call.
          </p>
          {s.faq.map((g) => (
            <div key={g.group} className="space-y-1">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.group}</h4>
              <Answers items={g.items} say={say} />
            </div>
          ))}
        </Section>

        <Section title="6. Gatekeeper">
          <ul className="space-y-2">
            {s.gatekeeper.map((g) => (
              <li key={g.label}>
                <p className="text-xs font-medium text-muted-foreground">{g.label}</p>
                <Quote>{say(g.text)}</Quote>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="7. Voicemail (under 20 seconds)">
          <Quote>{say(s.voicemail)}</Quote>
        </Section>

        <Section title="8. Follow-up text (right after)">
          <Quote>{say(s.followUpText)}</Quote>
        </Section>

        <Section title="Delivery rules">
          <ol className="list-decimal space-y-1 pl-5">
            {s.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </Section>

        <Section title="Never say">
          <ul className="space-y-1">
            {s.neverSay.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="select-none text-destructive" aria-hidden="true">
                  &times;
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      </CardContent>
    </Card>
  );
}

function Section({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-md border">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground marker:content-none hover:bg-muted/40 group-open:text-foreground [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="space-y-2 px-3 pb-3 leading-6">{children}</div>
    </details>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border bg-muted/40 px-3 py-2 leading-6">&ldquo;{children}&rdquo;</p>;
}

function Answers({
  items,
  say,
}: {
  items: readonly { q: string; a: string }[];
  say: (text: string) => React.ReactNode;
}) {
  return (
    <div className="divide-y rounded-md border">
      {items.map((o) => (
        <details key={o.q}>
          <summary className="cursor-pointer list-none px-3 py-2 font-medium marker:content-none hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
            &ldquo;{o.q}&rdquo;
          </summary>
          <p className="px-3 pb-3 leading-6 text-muted-foreground">&ldquo;{say(o.a)}&rdquo;</p>
        </details>
      ))}
    </div>
  );
}

/** Script text with any [blank] still unfilled marked so it stands out. */
function Say({ text }: { text: string }) {
  return (
    <>
      {splitPlaceholders(text).map((part, i) =>
        part.blank ? (
          <mark
            key={i}
            title="Not filled in yet: don't read this out"
            className="rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

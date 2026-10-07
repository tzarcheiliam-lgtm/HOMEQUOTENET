'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { detectEnv, disablePush, enablePush, readPushState, type PushEnv, type PushUiState } from '@/lib/notifications/client';
import { InstallSteps } from './install-helper';
import type { NotificationPreferences, NotificationType } from '@/lib/notifications/types';

interface TypeRow {
  id: NotificationType;
  label: string;
  description: string;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 py-2 text-left disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-sm text-muted-foreground">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-muted-foreground/30')}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-background shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
}

export function NotificationSettings({
  userId,
  types,
  initial,
  pushConfigured,
}: {
  userId: string;
  types: TypeRow[];
  initial: NotificationPreferences;
  pushConfigured: boolean;
}) {
  const [state, setState] = useState<PushUiState>('loading');
  const [env, setEnv] = useState<PushEnv>({ isIOS: false, standalone: false, canPush: false });
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setEnv(detectEnv());
    setState(await readPushState());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onEnable = async () => {
    setBusy(true);
    setMessage(null);
    const result = await enablePush(userId);
    setBusy(false);
    if (!result.ok) setMessage({ tone: 'error', text: result.message });
    else {
      setMessage({ tone: 'ok', text: 'Notifications are on for this device.' });
      toast('Notifications turned on');
    }
    await refresh();
  };

  const onDisable = async () => {
    setBusy(true);
    setMessage(null);
    await disablePush();
    setBusy(false);
    await refresh();
  };

  const onTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(
        res.ok
          ? { tone: 'ok', text: 'Test sent — it should arrive in a few seconds.' }
          : { tone: 'error', text: json.error ?? 'The test could not be delivered.' }
      );
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Try again.' });
    }
    setBusy(false);
  };

  const save = async (patch: Record<string, boolean>) => {
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      toast('Notification settings saved');
    } catch {
      toast('Could not save that change', 'error');
      setMessage({ tone: 'error', text: 'Could not save that change. Please try again.' });
    }
  };

  const setMaster = (v: boolean) => {
    setPrefs((p) => ({ ...p, enabled: v }));
    void save({ enabled: v });
  };
  const setType = (id: NotificationType, v: boolean) => {
    setPrefs((p) => ({ ...p, types: { ...p.types, [id]: v } }));
    void save({ [id]: v });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            {env.isIOS || env.standalone ? <Smartphone className="size-5" aria-hidden="true" /> : <BellRing className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Push notifications on this device</h2>
            <p className="text-sm text-muted-foreground">
              {env.standalone ? 'Running as the Home Screen app.' : 'Running in the browser.'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {state === 'loading' ? <p className="text-sm text-muted-foreground">Checking this device…</p> : null}

          {!pushConfigured ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              Push notifications have not been set up on the server yet (VAPID keys missing). In-app notifications still work.
            </p>
          ) : null}

          {pushConfigured && state === 'unsupported' ? (
            <p className="rounded-lg bg-muted p-3 text-sm">This browser does not support push notifications. Try Chrome, Edge, Firefox or Safari.</p>
          ) : null}

          {pushConfigured && state === 'ios-needs-install' ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-sm font-medium">On iPhone and iPad, push works from the Home Screen app:</p>
              <InstallSteps />
            </div>
          ) : null}

          {pushConfigured && state === 'denied' ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              Notifications are blocked for HomeQuote. Allow them in {env.isIOS ? 'Settings → Notifications → HomeQuote' : 'your browser’s site settings'}, then come back.
            </p>
          ) : null}

          {pushConfigured && (state === 'prompt' || state === 'missing') ? (
            <Button onClick={onEnable} disabled={busy} className="w-full sm:w-auto">
              <BellRing /> {busy ? 'Turning on…' : 'Enable Notifications'}
            </Button>
          ) : null}

          {pushConfigured && state === 'active' ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <p className="flex-1 self-center text-sm font-medium text-emerald-700">● Notifications are on for this device</p>
              <Button variant="outline" onClick={onTest} disabled={busy}>
                Send test notification
              </Button>
              <Button variant="outline" onClick={onDisable} disabled={busy}>
                Turn off
              </Button>
            </div>
          ) : null}

          {message ? (
            <p role="status" className={cn('text-sm', message.tone === 'error' ? 'text-destructive' : 'text-emerald-700')}>
              {message.text}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-base font-semibold">What to notify me about</h2>
        <div className="mt-2 divide-y">
          <Toggle
            checked={prefs.enabled}
            onChange={setMaster}
            label="All notifications"
            description="Master switch for push and the in-app notification list."
          />
          {types.map((t) => (
            <Toggle
              key={t.id}
              checked={prefs.types[t.id]}
              onChange={(v) => setType(t.id, v)}
              label={t.label}
              description={t.description}
              disabled={!prefs.enabled}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Lock-screen alerts never include names, phone numbers, addresses or money — open HomeQuote for the details.
        </p>
      </Card>
    </div>
  );
}

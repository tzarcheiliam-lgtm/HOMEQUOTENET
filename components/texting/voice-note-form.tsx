'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Square, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { prepareVoiceNoteUpload, saveVoiceNote, saveVoiceNoteWording, setVoiceNote, type SmsActionState } from '@/lib/actions/sms';
import { openingTemplateProblem } from '@/lib/sms/rules';
import {
  DEFAULT_VOICE_LINK_TEMPLATE, DEFAULT_VOICE_OFFER_TEMPLATE, MAX_VOICE_BYTES, MAX_VOICE_SECONDS, VOICE_NOTE_BUCKET, VOICE_NOTE_MIME,
  voiceLinkLine, voiceLinkTemplateProblem, voiceOfferMessage,
} from '@/lib/sms/voice-note';

export interface VoiceNoteValue {
  enabled: boolean;
  /** A short-lived link to play the saved voice note, or null when none is saved. */
  url: string | null;
  seconds: number | null;
  updatedAt: string | null;
  offerTemplate: string;
  linkTemplate: string;
  senderName: string;
  /** A contractor's own voice note (its contractor page); absent = HomeQuote's (Texting page). */
  contractorId?: string | null;
  /** Contractor page: the general memo question, shown as the placeholder. */
  generalOfferTemplate?: string;
}

const EXT_MIME: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/x-m4a', aac: 'audio/aac', wav: 'audio/wav', caf: 'audio/x-caf' };

function mimeOf(file: File): string | null {
  if ((VOICE_NOTE_MIME as readonly string[]).includes(file.type)) return file.type;
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  return EXT_MIME[ext] ?? null;
}

function durationOf(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (s: number) => { URL.revokeObjectURL(url); resolve(s); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => done(0);
    a.src = url;
  });
}

/** A browser recording (WebM / MP4) as 16-bit mono WAV at 24 kHz, which the Mac's afconvert can read. */
async function toWav(blob: Blob): Promise<{ wav: Blob; seconds: number }> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 24_000;
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const pcm = (await offline.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, rate, true);
    out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return { wav: new Blob([out.buffer], { type: 'audio/wav' }), seconds: decoded.duration };
  } finally {
    void ctx.close();
  }
}

export function VoiceNoteForm({ value }: { value: VoiceNoteValue }) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'recording' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); recorder.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function upload(blob: Blob, mime: string, seconds: number) {
    setError(null); setSavedMsg(null);
    if (blob.size > MAX_VOICE_BYTES) return setError(`That file is larger than ${MAX_VOICE_BYTES / 1024 / 1024} MB.`);
    if (seconds > MAX_VOICE_SECONDS) return setError(`Keep the voice note under ${MAX_VOICE_SECONDS} seconds (this one is ${Math.round(seconds)}).`);
    setPhase('saving');
    try {
      const prep = await prepareVoiceNoteUpload(mime, value.contractorId ?? null);
      if (!prep.ok) throw new Error(prep.error);
      const { error: upErr } = await createClient().storage.from(VOICE_NOTE_BUCKET).uploadToSignedUrl(prep.path, prep.token, blob, { contentType: mime });
      if (upErr) throw new Error('The upload failed. Check your connection and try again.');
      const r = await saveVoiceNote({ path: prep.path, mime, seconds: Math.max(1, Math.round(seconds)), contractorId: value.contractorId ?? null });
      if (!r?.ok) throw new Error(r?.error ?? 'Could not save.');
      setSavedMsg(r.message ?? 'Saved.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhase('idle');
    }
  }

  async function pickFile(file: File | null) {
    if (!file) return;
    const mime = mimeOf(file);
    if (!mime) return setError('Use an MP3, M4A, WAV, AAC or CAF audio file.');
    await upload(file, mime, (await durationOf(file)) || 1);
  }

  async function startRecording() {
    setError(null); setSavedMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        try {
          const { wav, seconds } = await toWav(new Blob(chunks.current, { type: rec.mimeType }));
          await upload(wav, 'audio/wav', seconds);
        } catch {
          setPhase('idle');
          setError('That recording could not be read. Try again, or upload a file instead.');
        }
      };
      recorder.current = rec;
      rec.start();
      setElapsed(0);
      const started = Date.now();
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setElapsed(s);
        if (s >= MAX_VOICE_SECONDS) rec.stop();
      }, 250);
      setPhase('recording');
    } catch {
      setError('The microphone is blocked. Allow it in your browser, or upload a file instead.');
    }
  }

  function stopRecording() {
    if (recorder.current?.state === 'recording') { setPhase('saving'); recorder.current.stop(); }
  }

  const busy = phase !== 'idle';
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {value.contractorId
            ? `While this is on, the first text to ${value.senderName}’s leads asks if you can send a quick voice memo. When they say yes, they get this voice note, then a link to describe their project and book the free in-home estimate. Off or not recorded: their usual first text.`
            : 'While this is on, the first text to a HomeQuote lead asks if you can send a quick voice memo. When they say yes, they get your voice note, then a link to describe their project and book the free in-home estimate. Each contractor’s branded texts use that contractor’s own voice note (set on their contractor page).'}
        </p>
        {value.url ? (
          <div className="space-y-2 rounded-md border p-3">
            <audio controls preload="none" src={value.url} className="w-full max-w-md" />
            <p className="text-xs text-muted-foreground">
              {value.seconds ? `${value.seconds} seconds` : 'Saved'}{value.updatedAt ? ` · saved ${new Date(value.updatedAt).toLocaleString()}` : ''}
            </p>
          </div>
        ) : <p className="text-sm">No voice note yet.</p>}

        <div className="flex flex-wrap items-center gap-2">
          {phase === 'recording' ? (
            <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
              <Square className="size-4" /> Stop and save ({elapsed}s / {MAX_VOICE_SECONDS}s)
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => void startRecording()} disabled={busy}>
              <Mic className="size-4" /> {value.url ? 'Record a new one' : 'Record'}
            </Button>
          )}
          <label className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload className="size-4" /> Upload a file
            <input type="file" accept="audio/*,.m4a,.mp3,.wav,.caf,.aac" className="sr-only" disabled={busy} onChange={(e) => { void pickFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          {phase === 'saving' && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Saving…</span>}
        </div>
        <p className="text-xs text-muted-foreground">Up to {MAX_VOICE_SECONDS} seconds. A voice memo you recorded on your iPhone (M4A) works well: AirDrop it to this computer and upload it.</p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {savedMsg && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{savedMsg}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t pt-3">
          <p className="text-sm">Voice memo question: <b className={value.enabled && value.url ? 'text-emerald-600' : 'text-muted-foreground'}>{value.enabled && value.url ? 'ON' : 'OFF'}</b></p>
          <form action={setVoiceNote}>
            {value.contractorId ? <input type="hidden" name="contractorId" value={value.contractorId} /> : null}
            <input type="hidden" name="do" value={value.enabled ? 'off' : 'on'} />
            <Button type="submit" size="sm" variant={value.enabled ? 'outline' : 'default'} disabled={!value.url || busy}>{value.enabled ? 'Turn off' : 'Turn on'}</Button>
          </form>
          {value.url && (
            <form action={setVoiceNote} onSubmit={(e) => { if (!confirm('Delete the voice note? The voice memo question turns off too.')) e.preventDefault(); }}>
              {value.contractorId ? <input type="hidden" name="contractorId" value={value.contractorId} /> : null}
              <input type="hidden" name="do" value="remove" />
              <Button type="submit" size="sm" variant="ghost" disabled={busy}>Delete voice note</Button>
            </form>
          )}
        </div>
      </div>
      <VoiceWordingForm value={value} />
    </div>
  );
}

function VoiceWordingForm({ value }: { value: VoiceNoteValue }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveVoiceNoteWording, undefined);
  const [offer, setOffer] = useState(value.offerTemplate);
  const [link, setLink] = useState(value.linkTemplate);
  const offerProblem = openingTemplateProblem(offer);
  const linkProblem = voiceLinkTemplateProblem(link);
  const sample = { firstName: 'Sam', senderName: value.senderName, project: 'bathroom remodel' };
  return (
    <form action={action} className="space-y-4 border-t pt-4">
      {value.contractorId ? <input type="hidden" name="contractorId" value={value.contractorId} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="voice_offer_template">First text (asks to send the voice memo)</Label>
        <textarea id="voice_offer_template" name="voice_offer_template" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={1000} rows={2}
          placeholder={value.generalOfferTemplate || DEFAULT_VOICE_OFFER_TEMPLATE} className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Blank uses the {value.contractorId ? 'general ' : ''}wording shown. Fill-ins: <code className="rounded bg-muted px-1">{'{first_name}'}</code> <code className="rounded bg-muted px-1">{'{sender}'}</code> <code className="rounded bg-muted px-1">{'{project}'}</code>. Must include <code className="rounded bg-muted px-1">{'{sender}'}</code>.</p>
        {offerProblem && <p role="alert" className="text-xs text-destructive">{offerProblem}</p>}
      </div>
      {value.contractorId ? <input type="hidden" name="voice_link_template" value="" /> : <div className="space-y-1.5">
        <Label htmlFor="voice_link_template">Line before the booking link</Label>
        <textarea id="voice_link_template" name="voice_link_template" value={link} onChange={(e) => setLink(e.target.value)} maxLength={1000} rows={2}
          placeholder={DEFAULT_VOICE_LINK_TEMPLATE} className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Sent after the voice note. The link follows in its own message so iMessage shows it as a card.</p>
        {linkProblem && <p role="alert" className="text-xs text-destructive">{linkProblem}</p>}
      </div>}
      <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">What a lead named Sam would get (preview)</p>
        <p>{voiceOfferMessage({ template: offerProblem ? '' : offer || value.generalOfferTemplate, ...sample })}</p>
        <p className="text-xs text-muted-foreground">They reply “yes please” →</p>
        <p>🎙 your voice note</p>
        <p>{voiceLinkLine({ template: linkProblem ? '' : link, ...sample })}</p>
        <p className="text-primary underline">homequotenet.com/booking/visit/…</p>
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending || !!offerProblem || !!linkProblem}>{pending ? 'Saving…' : 'Save wording'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}

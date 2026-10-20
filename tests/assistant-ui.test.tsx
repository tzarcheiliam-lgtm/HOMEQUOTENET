import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionCard } from '@/components/assistant/action-card';
import { BlockView } from '@/components/assistant/blocks';
import { RichText } from '@/components/assistant/rich-text';
import { ASSISTANT_GREETING, ASSISTANT_INTRO } from '@/lib/assistant/config';

describe('assistant UI safety and honesty', () => {
  it('renders replies without ever producing an unsafe link or raw HTML', () => {
    const html = renderToStaticMarkup(<RichText text={'[bad](javascript:alert(1)) [data](data:text/html,<script>x</script>) [ok](/app/leads/abc) [web](https://example.com) <img src=x onerror=alert(1)> **bold**'} />);
    expect(html).not.toMatch(/href="javascript:/i); expect(html).not.toMatch(/href="data:/i);
    expect(html).toMatch(/href="\/app\/leads\/abc"/); expect(html).toMatch(/href="https:\/\/example.com"/); expect(html).toMatch(/rel="noopener noreferrer"/);
    expect(html).not.toMatch(/<img/i); expect(html).toContain('&lt;img'); expect(html).toContain('<strong>bold</strong>');
  });
  it('renders an editable draft with copy, and says the assistant cannot send it', () => {
    const html = renderToStaticMarkup(<RichText text={'Here you go:\n```draft:text\nHi Sarah, confirming Friday.\n```'} />);
    expect(html).toMatch(/Text draft/); expect(html).toMatch(/<textarea/); expect(html).toMatch(/Copy/); expect(html).toMatch(/can.t send this/);
  });
  it('shows a prepared change as "Not saved yet" with Confirm and Cancel, never as done', () => {
    const html = renderToStaticMarkup(<ActionCard initial={{ id: 'a1', kind: 'add_note', status: 'proposed', preview: { title: 'Add note', target: { label: 'Sarah Lee', href: '/app/leads/1' }, lines: ['Called Sarah'], warning: 'Nothing will notify you.' } }} />);
    expect(html).toMatch(/Not saved yet/); expect(html).toMatch(/Confirm/); expect(html).toMatch(/Cancel/); expect(html).not.toMatch(/>Done</); expect(html).toMatch(/Nothing will notify you/);
  });
  it('shows an editable document preview with read-only wording', () => {
    const html = renderToStaticMarkup(<ActionCard initial={{ id: 'a2', kind: 'create_document', status: 'proposed', preview: { title: 'Create proposal', target: { label: 'Sarah Lee', href: '/app/leads/1#documents' }, lines: [], confirmLabel: 'Save draft',
      document: { docType: 'proposal', templateName: 'T', templateVersionNo: 1, jurisdiction: null, title: 'T', fields: [{ key: 'total_price', label: 'Total price', kind: 'money', value: '', required: true, fromLead: false }, { key: 'customer_name', label: 'Customer name', kind: 'text', value: 'Sarah Lee', required: true, fromLead: true }], sections: [], missing: [], invalid: [], reviewPassages: 0 } } }} />);
    expect(html).toMatch(/Save draft/); expect(html).toMatch(/Total price \*/); expect(html).toMatch(/from the lead/); expect(html).toMatch(/can.t be changed here/);
  });
  it('shows a failed change as failed and an executed one only with its receipt', () => {
    const failed = renderToStaticMarkup(<ActionCard initial={{ id: 'a3', kind: 'update_status', status: 'failed', error: 'The status could not be updated.', preview: { title: 'Update status', target: { label: 'x', href: '/app' }, lines: [] } }} />);
    expect(failed).toMatch(/could not be updated/); expect(failed).not.toMatch(/Confirm/);
    const done = renderToStaticMarkup(<ActionCard initial={{ id: 'a4', kind: 'add_note', status: 'executed', result: { href: '/app/leads/1', label: 'Sarah Lee', message: 'Note saved on the lead.' }, preview: { title: 'Add note', target: { label: 'x', href: '/app' }, lines: [] } }} />);
    expect(done).toMatch(/Note saved on the lead/); expect(done).toMatch(/View Sarah Lee/);
  });
  it('labels every tracking status row and never marks an unknown as ok', () => {
    const html = renderToStaticMarkup(<BlockView disabled={false} onPick={() => undefined} block={{ type: 'status', title: 'Tracking', rows: [{ label: 'Dedup', value: 'Not confirmed', state: 'unknown' }, { label: 'Pixel', value: 'Seen', state: 'ok' }] }} />);
    expect(html).toMatch(/aria-label="Not verified"/); expect(html).toMatch(/aria-label="OK"/);
  });
  it('lets the greeting be renamed in one place', () => {
    expect(ASSISTANT_GREETING).toBe('Complote?'); expect(ASSISTANT_INTRO).toBe('Ask me about your leads, appointments, or what needs your attention.');
  });
});

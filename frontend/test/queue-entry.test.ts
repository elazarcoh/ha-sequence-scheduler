import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/queue-entry';
import type { Preview, PreviewRow } from '../src/types';

const row = (lineno: number, ok: boolean, over: Partial<PreviewRow> = {}): PreviewRow => ({
  lineno, raw: `line ${lineno}`, ok, errors: ok ? [] : [{ code: 'not_an_option', detail: "fan: 'low' is not one of auto, quiet, high" }],
  warnings: [], template_id: 't', template_name: 'Kids AC', values: { temp: 25 },
  start_at: '2026-11-07T23:00:00+00:00', end_at: '2026-11-08T00:00:00+00:00', entity_ids: [],
  start_actions: [], end_actions: [], relative: false, ...over,
});

const SPEC_PREVIEW: Preview = {
  now: '2026-11-07T21:00:00+02:00',
  token: 'tok-1',
  rows: [row(1, true), row(2, true), row(3, true), row(4, true), row(5, true, { end_at: null }), row(6, false)],
};

function fakeHass() {
  const callWS = vi.fn(async (msg: any): Promise<any> => {
    if (msg.type === 'sequence_scheduler/templates/list') return { templates: [] };
    if (msg.type === 'sequence_scheduler/preview') return SPEC_PREVIEW;
    if (msg.type === 'sequence_scheduler/queue') return { queued: 5 };
    return {};
  });
  return { callWS, config: { time_zone: 'Asia/Jerusalem' }, connection: { subscribeMessage: vi.fn() } };
}

async function mount(hass: any) {
  const el = document.createElement('seq-queue-entry') as any;
  el.hass = hass;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function type(el: any, text: string) {
  const ta = el.shadowRoot.querySelector('textarea') as HTMLTextAreaElement;
  ta.value = text;
  ta.dispatchEvent(new Event('input'));
  await el.updateComplete;
}

async function settle(el: any) {
  await vi.advanceTimersByTimeAsync(300);
  await el.updateComplete;
}

const previewCalls = (hass: any) =>
  hass.callWS.mock.calls.filter((c: any[]) => c[0].type === 'sequence_scheduler/preview');

describe('seq-queue-entry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('previews once, 300 ms after typing stops', async () => {
    const hass = fakeHass();
    const el = await mount(hass);
    await type(el, 'kids 01:00');
    await type(el, 'kids 01:00 1h');
    await vi.advanceTimersByTimeAsync(299);
    expect(previewCalls(hass)).toHaveLength(0);
    await settle(el);
    expect(previewCalls(hass)).toHaveLength(1);
    expect(previewCalls(hass)[0][0].text).toBe('kids 01:00 1h');
  });

  it('labels the button with what will queue and what needs fixing', async () => {
    const el = await mount(fakeHass());
    await type(el, 'x');
    await settle(el);
    const button = el.shadowRoot.querySelector('button.queue') as HTMLButtonElement;
    expect(button.textContent!.trim()).toBe('Queue 5 · fix 1');
    expect(button.disabled).toBe(false);
  });

  it('renders readback rows with local times, day label and errors', async () => {
    const el = await mount(fakeHass());
    await type(el, 'x');
    await settle(el);
    const rows = el.shadowRoot.querySelectorAll('.row');
    expect(rows).toHaveLength(6);
    expect(rows[0].querySelector('.time').textContent).toContain('01:00–02:00');
    expect(rows[0].querySelector('.time').getAttribute('dir')).toBe('ltr');
    expect(rows[0].textContent).toContain('tomorrow');
    expect(rows[0].querySelector('.name').getAttribute('dir')).toBe('auto');
    expect(rows[4].querySelector('.time').textContent).not.toContain('–');
    expect(rows[5].textContent).toContain('is not one of auto, quiet, high');
  });

  it('marks a relative start as counted from the Queue press', async () => {
    const hass = fakeHass();
    const relative: Preview = { ...SPEC_PREVIEW, rows: [row(1, true, { relative: true })] };
    hass.callWS.mockImplementation(async (msg: any) =>
      msg.type === 'sequence_scheduler/preview' ? relative : { templates: [] });
    const el = await mount(hass);
    await type(el, 'kids +30m 1h');
    await settle(el);
    const r = el.shadowRoot.querySelector('.row');
    expect(r.querySelector('.time').textContent).toContain('≈01:00–02:00');
    expect(r.querySelector('.day').textContent).toBe('from Queue press');
  });

  it('queues with the last preview token and clears the text', async () => {
    const hass = fakeHass();
    const el = await mount(hass);
    await type(el, 'kids 01:00 1h');
    await settle(el);
    (el.shadowRoot.querySelector('button.queue') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    await el.updateComplete;
    const q = hass.callWS.mock.calls.find((c: any[]) => c[0].type === 'sequence_scheduler/queue')![0];
    expect(q).toMatchObject({ text: 'kids 01:00 1h', now: SPEC_PREVIEW.now, token: 'tok-1' });
    expect((el.shadowRoot.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
    expect(el.shadowRoot.textContent).toContain('Queued 5');
  });

  it('re-previews and explains when the preview changed', async () => {
    const hass = fakeHass();
    const el = await mount(hass);
    await type(el, 'kids 01:00 1h');
    await settle(el);
    hass.callWS.mockImplementationOnce(async () => {
      throw { code: 'preview_changed', message: 'changed' };
    });
    (el.shadowRoot.querySelector('button.queue') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    await el.updateComplete;
    expect(previewCalls(hass)).toHaveLength(2);
    expect(el.shadowRoot.textContent).toContain('Something changed. Check the list and queue again.');
  });

  it('disables the button when nothing is valid', async () => {
    const hass = fakeHass();
    hass.callWS.mockImplementation(async (msg: any): Promise<any> =>
      msg.type === 'sequence_scheduler/preview' ? { ...SPEC_PREVIEW, rows: [row(1, false)] } : { templates: [] });
    const el = await mount(hass);
    await type(el, 'x');
    await settle(el);
    expect((el.shadowRoot.querySelector('button.queue') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('seq-queue-entry partial queue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('keeps refused lines in the text box and names them', async () => {
    const hass = fakeHass();
    hass.callWS.mockImplementation(async (msg: any): Promise<any> => {
      if (msg.type === 'sequence_scheduler/templates/list') return { templates: [] };
      if (msg.type === 'sequence_scheduler/preview') return SPEC_PREVIEW;
      return {
        queued: 1,
        refused: [{ lineno: 1, raw: 'kids 00:00 1h', errors: [{ code: 'already_past', detail: 'line 1: its time has passed' }] }],
      };
    });
    const el = await mount(hass);
    await type(el, 'kids 00:00 1h\nkids 05:00 1.5h');
    await settle(el);
    (el.shadowRoot.querySelector('button.queue') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    await el.updateComplete;
    expect((el.shadowRoot.querySelector('textarea') as HTMLTextAreaElement).value).toBe('kids 00:00 1h');
    const text = el.shadowRoot.textContent;
    expect(text).toContain('Queued 1');
    expect(text).toContain('Not queued: kids 00:00 1h (its time has passed)');
  });
});

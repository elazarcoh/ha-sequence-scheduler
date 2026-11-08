import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/queue-list';
import type { Block } from '../src/types';

const step = (id: string, phase: 'start' | 'end', at: string, state: 'pending' | 'in_progress' = 'pending') => ({
  id, phase, at, actions: [], state,
});

const PENDING: Block = {
  id: 'b1', line: 'kids 01:00 1h 25', template_name: 'Kids AC', values: { temp: 25 }, entity_ids: [],
  created_at: '2026-11-07T19:00:00+00:00',
  steps: [step('s1', 'start', '2026-11-07T23:00:00+00:00'), step('s2', 'end', '2026-11-08T00:00:00+00:00')],
};
const RUNNING: Block = {
  ...PENDING, id: 'b2', line: 'מזגן 05:00 1.5h', template_name: 'מזגן חדר בנות',
  steps: [step('s3', 'end', '2026-11-08T04:30:00+00:00')],
};

function fakeHass() {
  let push: ((m: any) => void) | null = null;
  const unsubscribe = vi.fn();
  const hass = {
    config: { time_zone: 'Asia/Jerusalem' },
    callWS: vi.fn(async () => ({})),
    connection: {
      subscribeMessage: vi.fn(async (cb: any) => {
        push = cb;
        return unsubscribe;
      }),
    },
  };
  return { hass, send: (blocks: Block[]) => push!({ blocks }), unsubscribe };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount(hass: any) {
  const el = document.createElement('seq-queue-list') as any;
  el.hass = hass;
  document.body.appendChild(el);
  await el.updateComplete;
  await flush();
  return el;
}

const cancelCalls = (hass: any) =>
  hass.callWS.mock.calls.filter((c: any[]) => c[0].type === 'sequence_scheduler/queue/cancel').map((c: any[]) => c[0]);

describe('seq-queue-list', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('says a start failed or was skipped instead of running', async () => {
    const { hass, send } = fakeHass();
    const el = await mount(hass);
    send([
      { ...RUNNING, id: 'f', start_outcome: 'failed', start_detail: 'climate.set_temperature: bad field' },
      { ...RUNNING, id: 's', start_outcome: 'skipped', start_detail: 'overdue by 20 min' },
      { ...RUNNING, id: 'r', start_outcome: 'ran', start_detail: '' },
    ]);
    await el.updateComplete;
    const text = [...el.shadowRoot.querySelectorAll('.block')].map((b: any) => b.textContent);
    expect(text[0]).toContain('start failed: climate.set_temperature: bad field');
    expect(text[0]).not.toContain('running');
    expect(text[1]).toContain('start skipped: overdue by 20 min');
    expect(text[2]).toContain('running');
  });

  it('shows the empty state, then blocks from a push', async () => {
    const { hass, send } = fakeHass();
    const el = await mount(hass);
    send([]);
    await el.updateComplete;
    expect(el.shadowRoot.textContent).toContain('Nothing queued.');
    send([PENDING, RUNNING]);
    await el.updateComplete;
    const blocks = el.shadowRoot.querySelectorAll('.block');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].textContent).toContain('kids 01:00 1h 25');
    expect(blocks[0].textContent).toContain('start 01:00');
    expect(blocks[0].textContent).toContain('end 02:00');
    expect(blocks[1].querySelector('.name').getAttribute('dir')).toBe('auto');
    expect(blocks[1].textContent).toContain('running');
  });

  it('cancels a block that has not started without asking', async () => {
    const { hass, send } = fakeHass();
    const el = await mount(hass);
    send([PENDING]);
    await el.updateComplete;
    (el.shadowRoot.querySelector('.block button.cancel') as HTMLElement).click();
    await flush();
    expect(cancelCalls(hass)).toEqual([{ type: 'sequence_scheduler/queue/cancel', block_id: 'b1', run_end: false }]);
  });

  it.each([
    ['run-end', [{ type: 'sequence_scheduler/queue/cancel', block_id: 'b2', run_end: true }]],
    ['just-cancel', [{ type: 'sequence_scheduler/queue/cancel', block_id: 'b2', run_end: false }]],
    ['keep', []],
  ])('asks before cancelling a running block: %s', async (choice, expected) => {
    const { hass, send } = fakeHass();
    const el = await mount(hass);
    send([RUNNING]);
    await el.updateComplete;
    (el.shadowRoot.querySelector('.block button.cancel') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot.textContent).toContain('Turn it off now?');
    (el.shadowRoot.querySelector(`button.${choice}`) as HTMLElement).click();
    await flush();
    await el.updateComplete;
    expect(cancelCalls(hass)).toEqual(expected);
    expect(el.shadowRoot.textContent).not.toContain('Turn it off now?');
  });

  it('unsubscribes when removed', async () => {
    const { hass, unsubscribe } = fakeHass();
    const el = await mount(hass);
    el.remove();
    await flush();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

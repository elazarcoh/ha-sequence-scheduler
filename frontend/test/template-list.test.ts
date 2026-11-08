import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/template-list';

const flush = () => new Promise((r) => setTimeout(r, 0));
const KIDS = {
  id: 't1', key: 'kids', name: 'Kids AC',
  start: [{ action: 'climate.set_temperature', target: {}, data: {} }],
  end: [{ action: 'climate.turn_off', target: {}, data: {} }],
  placeholders: [],
};

function fakeHass() {
  return {
    states: {},
    callWS: vi.fn(async (msg: any): Promise<any> => (msg.type === 'sequence_scheduler/templates/list' ? { templates: [KIDS] } : {})),
    connection: { subscribeMessage: vi.fn() },
  };
}

async function render(hass: any) {
  const el = document.createElement('seq-template-list') as any;
  el.hass = hass;
  document.body.appendChild(el);
  await el.updateComplete;
  await flush();
  await el.updateComplete;
  return el;
}

describe('seq-template-list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists templates with a start → end summary', async () => {
    const el = await render(fakeHass());
    const row = el.shadowRoot.querySelector('.template');
    expect(row.textContent).toContain('kids');
    expect(row.textContent).toContain('Kids AC');
    expect(row.textContent).toContain('climate.set_temperature → climate.turn_off');
  });

  it('confirms before deleting, naming the template', async () => {
    const hass = fakeHass();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = await render(hass);
    (el.shadowRoot.querySelector('button.delete') as HTMLElement).click();
    await flush();
    expect(confirm).toHaveBeenCalledWith('Delete "Kids AC"? Already queued plans keep running.');
    expect(hass.callWS).toHaveBeenCalledWith({ type: 'sequence_scheduler/templates/delete', template_id: 't1' });
  });

  it('does not delete when the confirmation is declined', async () => {
    const hass = fakeHass();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const el = await render(hass);
    (el.shadowRoot.querySelector('button.delete') as HTMLElement).click();
    await flush();
    expect(hass.callWS.mock.calls.some((c: any[]) => c[0].type === 'sequence_scheduler/templates/delete')).toBe(false);
  });

  it('opens the dialog to add and to edit', async () => {
    const el = await render(fakeHass());
    (el.shadowRoot.querySelector('button.add-template') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('seq-template-dialog').template).toBeNull();
    el.shadowRoot.querySelector('seq-template-dialog').dispatchEvent(new CustomEvent('closed'));
    await el.updateComplete;
    (el.shadowRoot.querySelector('button.edit') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('seq-template-dialog').template.id).toBe('t1');
  });
});

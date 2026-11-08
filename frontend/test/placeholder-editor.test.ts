import { describe, expect, it, vi } from 'vitest';
import '../src/placeholder-editor';

const hass: any = {
  services: { climate: { set_temperature: { fields: { temperature: { selector: { number: { min: 7, max: 35 } } } } } } },
};
const actions = [
  { action: 'climate.set_temperature', target: {}, data: { hvac_mode: 'cool', temperature: 26, fan_mode: 'silent' } },
  { action: 'climate.turn_off', target: {}, data: {} },
];

async function render(value: any[] = []) {
  const el = document.createElement('seq-placeholder-editor') as any;
  Object.assign(el, { hass, actions, value });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('seq-placeholder-editor', () => {
  it('offers the data keys of the actions as fields', async () => {
    const el = await render([{ key: '', field: '', kind: 'text', default: '', min: null, max: null, options: null }]);
    const options = [...el.shadowRoot.querySelectorAll('select.field option')].map((o: any) => o.value);
    expect(options).toEqual(['', 'hvac_mode', 'temperature', 'fan_mode']);
  });

  it('picking a field fills kind, bounds, default and a key', async () => {
    const el = await render([{ key: '', field: '', kind: 'text', default: '', min: null, max: null, options: null }]);
    const seen = vi.fn();
    el.addEventListener('placeholders-changed', (e: CustomEvent) => seen(e.detail.value));
    const select = el.shadowRoot.querySelector('select.field') as HTMLSelectElement;
    select.value = 'temperature';
    select.dispatchEvent(new Event('change'));
    expect(seen).toHaveBeenLastCalledWith([
      { key: 'temperature', field: 'temperature', kind: 'number', default: 26, min: 7, max: 35, options: null },
    ]);
  });

  it('adds and removes rows', async () => {
    const el = await render([]);
    const seen = vi.fn();
    el.addEventListener('placeholders-changed', (e: CustomEvent) => seen(e.detail.value));
    (el.shadowRoot.querySelector('button.add') as HTMLElement).click();
    expect(seen.mock.calls.at(-1)![0]).toHaveLength(1);
    el.value = seen.mock.calls.at(-1)![0];
    await el.updateComplete;
    (el.shadowRoot.querySelector('button.remove') as HTMLElement).click();
    expect(seen.mock.calls.at(-1)![0]).toEqual([]);
  });

  it('editing the key and default emits typed values', async () => {
    const el = await render([{ key: 'temp', field: 'temperature', kind: 'number', default: 26, min: 7, max: 35, options: null }]);
    const seen = vi.fn();
    el.addEventListener('placeholders-changed', (e: CustomEvent) => seen(e.detail.value));
    const def = el.shadowRoot.querySelector('input.default') as HTMLInputElement;
    def.value = '24';
    def.dispatchEvent(new Event('change'));
    expect(seen.mock.calls.at(-1)![0][0].default).toBe(24);
    const key = el.shadowRoot.querySelector('input.key') as HTMLInputElement;
    key.value = 't';
    key.dispatchEvent(new Event('change'));
    expect(seen.mock.calls.at(-1)![0][0].key).toBe('t');
  });
});

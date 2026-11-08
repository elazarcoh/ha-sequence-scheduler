import { describe, expect, it, vi } from 'vitest';
import '../src/target-editor';

async function render(value: Record<string, unknown> = {}) {
  const el = document.createElement('seq-target-editor') as any;
  Object.assign(el, { hass: { states: {} }, value });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('seq-target-editor', () => {
  it('renders an ha-selector with a target selector and the value', async () => {
    const el = await render({ entity_id: ['climate.kids'] });
    const sel = el.shadowRoot.querySelector('ha-selector');
    expect(sel.selector).toEqual({ target: {} });
    expect(sel.value).toEqual({ entity_id: ['climate.kids'] });
  });

  it('normalises a cleared value to an empty object', async () => {
    const el = await render({ entity_id: ['climate.kids'] });
    const seen = vi.fn();
    el.addEventListener('target-changed', (e: CustomEvent) => seen(e.detail.value));
    el.shadowRoot.querySelector('ha-selector').dispatchEvent(new CustomEvent('value-changed', { detail: { value: undefined } }));
    expect(seen).toHaveBeenCalledWith({});
  });
});

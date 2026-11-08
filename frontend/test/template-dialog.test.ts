import { describe, expect, it, vi } from 'vitest';
import '../src/template-dialog';

const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeHass(impl?: (msg: any) => any) {
  return {
    states: {},
    services: { climate: { set_temperature: { fields: { temperature: { selector: { number: { min: 7, max: 35 } } } } } } },
    callWS: vi.fn(async (msg: any) => (impl ? impl(msg) : { template: { ...msg.template, id: 'new' } })),
    connection: { subscribeMessage: vi.fn() },
  };
}

async function render(hass: any, template: any = null) {
  const el = document.createElement('seq-template-dialog') as any;
  Object.assign(el, { hass, template });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const input = (el: any, sel: string, value: string) => {
  const i = el.shadowRoot.querySelector(sel) as HTMLInputElement;
  i.value = value;
  i.dispatchEvent(new Event('input'));
};

const service = (el: any, index: number, section: 'start' | 'end') =>
  el.shadowRoot.querySelectorAll(`.${section} seq-service-editor`)[index];
const target = (el: any, index: number, section: 'start' | 'end') =>
  el.shadowRoot.querySelectorAll(`.${section} seq-target-editor`)[index];

describe('seq-template-dialog', () => {
  it("passes each action's target to its action editor", async () => {
    const el = document.createElement('seq-template-dialog') as any;
    el.hass = fakeHass();
    el.template = {
      id: 't', key: 'kids', name: 'Kids', placeholders: [], end: [],
      start: [{ action: 'climate.set_hvac_mode', target: { entity_id: ['climate.kids'] }, data: { hvac_mode: 'cool' } }],
    };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(service(el, 0, 'start').target).toEqual({ entity_id: ['climate.kids'] });
  });

  it('saves the kids example as the backend expects it', async () => {
    const hass = fakeHass();
    const el = await render(hass);
    input(el, 'input.key', 'kids');
    input(el, 'input.name', 'Kids AC');
    target(el, 0, 'start').dispatchEvent(new CustomEvent('target-changed', { detail: { value: { entity_id: ['climate.kids'] } } }));
    service(el, 0, 'start').dispatchEvent(new CustomEvent('service-changed', {
      detail: { action: 'climate.set_temperature', data: { hvac_mode: 'cool', temperature: 26, fan_mode: 'silent' } },
    }));
    await el.updateComplete;
    // The end action starts with the start's target copied in.
    expect(target(el, 0, 'end').value).toEqual({ entity_id: ['climate.kids'] });
    service(el, 0, 'end').dispatchEvent(new CustomEvent('service-changed', { detail: { action: 'climate.turn_off', data: {} } }));
    el.shadowRoot.querySelector('seq-placeholder-editor').dispatchEvent(new CustomEvent('placeholders-changed', {
      detail: { value: [{ key: 'temp', field: 'temperature', kind: 'number', default: 26, min: 7, max: 35, options: null }] },
    }));
    await el.updateComplete;
    const saved = vi.fn();
    el.addEventListener('saved', saved);
    (el.shadowRoot.querySelector('button.save') as HTMLElement).click();
    await flush();
    expect(hass.callWS).toHaveBeenCalledWith({
      type: 'sequence_scheduler/templates/save',
      template: {
        key: 'kids',
        name: 'Kids AC',
        start: [{ action: 'climate.set_temperature', target: { entity_id: ['climate.kids'] }, data: { hvac_mode: 'cool', temperature: 26, fan_mode: 'silent' } }],
        end: [{ action: 'climate.turn_off', target: { entity_id: ['climate.kids'] }, data: {} }],
        placeholders: [{ key: 'temp', field: 'temperature', kind: 'number', default: 26, min: 7, max: 35, options: null }],
      },
    });
    expect(saved).toHaveBeenCalled();
  });

  it('a new action copies the previous action target', async () => {
    const el = await render(fakeHass());
    target(el, 0, 'start').dispatchEvent(new CustomEvent('target-changed', { detail: { value: { entity_id: ['switch.a'] } } }));
    await el.updateComplete;
    (el.shadowRoot.querySelector('.start button.add-action') as HTMLElement).click();
    await el.updateComplete;
    expect(target(el, 1, 'start').value).toEqual({ entity_id: ['switch.a'] });
  });

  it('no end sends an empty end list and keeps the id when editing', async () => {
    const hass = fakeHass();
    const existing = {
      id: 't1', key: 'boiler', name: 'Boiler',
      start: [{ action: 'switch.turn_on', target: { entity_id: 'switch.boiler' }, data: {} }],
      end: [{ action: 'switch.turn_off', target: { entity_id: 'switch.boiler' }, data: {} }],
      placeholders: [],
    };
    const el = await render(hass, existing);
    const toggle = el.shadowRoot.querySelector('input.no-end') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await el.updateComplete;
    (el.shadowRoot.querySelector('button.save') as HTMLElement).click();
    await flush();
    const sent = hass.callWS.mock.calls[0][0].template;
    expect(sent.id).toBe('t1');
    expect(sent.end).toEqual([]);
  });

  it('shows a server error next to the form', async () => {
    const hass = fakeHass(() => {
      throw { code: 'template_invalid', message: 'duplicate_key: kids is already used' };
    });
    const el = await render(hass);
    (el.shadowRoot.querySelector('button.save') as HTMLElement).click();
    await flush();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.error').textContent).toContain('kids is already used');
  });
});

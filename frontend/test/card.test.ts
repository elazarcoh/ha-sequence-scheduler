import { describe, expect, it, vi } from 'vitest';
import '../src/card';

function mount(hass: any) {
  const el = document.createElement('sequence-scheduler-card') as any;
  el.hass = hass;
  document.body.appendChild(el);
  return el;
}

const hass = (admin: boolean) => ({
  user: { is_admin: admin },
  callWS: vi.fn(async () => ({ templates: [], blocks: [] })),
  connection: { subscribeMessage: vi.fn(async () => () => {}) },
});

describe('sequence-scheduler-card', () => {
  it('shows the queue tab first and switches to templates', async () => {
    const el = mount(hass(true));
    await el.updateComplete;
    const root = el.shadowRoot!;
    expect(root.querySelector('seq-queue-entry')).not.toBeNull();
    expect(root.querySelector('seq-queue-list')).not.toBeNull();
    (root.querySelectorAll('[role=tab]')[1] as HTMLElement).click();
    await el.updateComplete;
    expect(root.querySelector('seq-template-list')).not.toBeNull();
    expect(root.querySelector('seq-queue-entry')).toBeNull();
  });

  it('tells a non-admin it is admin only', async () => {
    const el = mount(hass(false));
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Only an administrator');
  });
});

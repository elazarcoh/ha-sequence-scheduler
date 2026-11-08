import { describe, expect, it } from 'vitest';
import { kindFor } from '../src/kinds';

const hass: any = {
  services: {
    climate: {
      set_temperature: {
        fields: {
          temperature: { selector: { number: { min: 7, max: 35, step: 0.5 } } },
          hvac_mode: { selector: { select: { options: ['off', 'heat', 'cool', { value: 'auto', label: 'Auto' }] } } },
        },
      },
      set_fan_mode: { fields: { fan_mode: { selector: { text: {} } } } },
    },
    light: {
      turn_on: {
        fields: {
          advanced_fields: { collapsed: true, fields: { brightness_pct: { selector: { number: { min: 0, max: 100 } } } } },
          effect: { selector: { text: {} } },
        },
      },
    },
  },
};

describe('kindFor', () => {
  it('reads number selectors with min and max', () => {
    expect(kindFor(hass, 'climate.set_temperature', 'temperature')).toEqual({ kind: 'number', min: 7, max: 35 });
  });
  it('treats *_pct numbers as percent, also inside sections', () => {
    expect(kindFor(hass, 'light.turn_on', 'brightness_pct')).toEqual({ kind: 'percent', min: 0, max: 100 });
  });
  it('reads select options as strings', () => {
    expect(kindFor(hass, 'climate.set_temperature', 'hvac_mode')).toEqual({
      kind: 'select', options: ['off', 'heat', 'cool', 'auto'],
    });
  });
  it('makes *_mode fields a device-backed select', () => {
    expect(kindFor(hass, 'climate.set_fan_mode', 'fan_mode')).toEqual({ kind: 'select' });
    // A field the service does not describe at all, named like a mode.
    expect(kindFor(hass, 'climate.set_temperature', 'fan_mode')).toEqual({ kind: 'select' });
  });
  it('falls back to text', () => {
    expect(kindFor(hass, 'light.turn_on', 'effect')).toEqual({ kind: 'text' });
    expect(kindFor({}, 'x.y', 'z')).toEqual({ kind: 'text' });
  });
});

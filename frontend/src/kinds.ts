/** Derive a placeholder's kind from Home Assistant's own service schema. */
import type { Hass, Kind } from './types';

export interface KindInfo {
  kind: Kind;
  min?: number;
  max?: number;
  options?: string[];
}

function findField(fields: Record<string, any> | undefined, name: string): any {
  if (!fields) return undefined;
  if (fields[name]) return fields[name];
  // Sections (e.g. light.turn_on's `advanced_fields`) nest their own fields.
  for (const value of Object.values(fields)) {
    if (value && typeof value === 'object' && value.fields) {
      const found = findField(value.fields, name);
      if (found) return found;
    }
  }
  return undefined;
}

export function kindFor(hass: Partial<Hass> | null, action: string, field: string): KindInfo {
  const [domain, service] = action.split('.', 2);
  const selector = findField(hass?.services?.[domain]?.[service]?.fields, field)?.selector ?? {};
  if (selector.number) {
    const info: KindInfo = { kind: field.endsWith('_pct') ? 'percent' : 'number' };
    if (typeof selector.number.min === 'number') info.min = selector.number.min;
    if (typeof selector.number.max === 'number') info.max = selector.number.max;
    return info;
  }
  if (selector.select?.options?.length) {
    return {
      kind: 'select',
      options: selector.select.options.map((o: any) => String(typeof o === 'object' ? o.value : o)),
    };
  }
  // fan_mode, hvac_mode, preset_mode...: the backend reads `<field>s` from
  // the targeted devices, so validation follows the real device.
  if (field.endsWith('_mode')) return { kind: 'select' };
  return { kind: 'text' };
}

import { describe, expect, it } from 'vitest';
import { hintFor } from '../src/hints';
import type { Template } from '../src/types';

const t = (key: string, placeholders: any[] = []): Template => ({
  id: key, key, name: key, start: [], end: [], placeholders,
});

const KIDS = t('kids', [
  { key: 'temp', field: 'temperature', kind: 'number', default: 26, min: 16, max: 30, options: null, resolved_options: null },
  { key: 'fan', field: 'fan_mode', kind: 'select', default: 'silent', min: null, max: null, options: null,
    resolved_options: ['auto', 'quiet', 'silent', 'high'] },
]);
const TEMPLATES = [KIDS, t('kitchen'), t('heater'), t('מזגן', KIDS.placeholders)];

describe('hintFor', () => {
  it('completes template keys from a prefix', () => {
    expect(hintFor('k', TEMPLATES)).toBe('kids · kitchen');
    expect(hintFor('KI', TEMPLATES)).toBe('kids · kitchen');
  });

  it('says unknown for a prefix or key nothing matches', () => {
    expect(hintFor('zz', TEMPLATES)).toBe('unknown template');
    expect(hintFor('zz 01:00', TEMPLATES)).toBe('unknown template');
  });

  it('lists the placeholders still to fill after key and time', () => {
    const full = 'temp (26) · fan (silent: auto / quiet / silent / high)';
    expect(hintFor('kids 01:00 ', TEMPLATES)).toBe(full);
    expect(hintFor('kids 01:00 1h ', TEMPLATES)).toBe(full);
    expect(hintFor('kids 01:00 1h30', TEMPLATES)).toBe(full);
  });

  it('drops placeholders already given by position or name', () => {
    expect(hintFor('kids 01:00 1h 25 ', TEMPLATES)).toBe('fan (silent: auto / quiet / silent / high)');
    expect(hintFor('kids 01:00 1h fan=quiet', TEMPLATES)).toBe('temp (26)');
    expect(hintFor('kids 01:00 1h 25 silent', TEMPLATES)).toBeNull();
  });

  it('accepts relative starts, clock ends and ranges', () => {
    const full = 'temp (26) · fan (silent: auto / quiet / silent / high)';
    for (const line of ['kids +30m ', 'kids now ', 'kids NOW 1h ', 'kids +1h30 02:00 ',
      'kids 01:00 02:30 ', 'kids 01:00-02:30 ', 'kids now-6:00 ', 'kids +10m-03:00 ']) {
      expect(hintFor(line, TEMPLATES), line).toBe(full);
    }
    expect(hintFor('kids 01:00-02:30 25 ', TEMPLATES)).toBe('fan (silent: auto / quiet / silent / high)');
    expect(hintFor('kids +30 ', TEMPLATES)).toBeNull();
  });

  it('works with a Hebrew key', () => {
    expect(hintFor('מזגן 01:00 1h ', TEMPLATES)).toContain('temp (26)');
  });

  it('is null for blank lines, comments and before a time', () => {
    expect(hintFor('', TEMPLATES)).toBeNull();
    expect(hintFor('# note', TEMPLATES)).toBeNull();
    expect(hintFor('kids ', TEMPLATES)).toBeNull();
  });

  it('is null for a template without placeholders once timed', () => {
    expect(hintFor('heater 06:00 45m', TEMPLATES)).toBeNull();
  });
});

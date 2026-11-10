/**
 * The hint under the text box, for the line the cursor is on.
 *
 * A convenience only: the backend's preview is the authority on what a
 * line means. The token rules mirror custom_components/.../parse.py.
 */
import type { Placeholder, Template } from './types';

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const COMPACT = /^([01]?\d|2[0-3])([0-5]\d)$/;
const TWELVE = /^(0?[1-9]|1[0-2])(:?[0-5]\d)?(am|pm)$/i;

/** 22:00, 10pm, 10:30pm, 1030pm, and (unless `compact` is false) 2200 / 930. */
const isClock = (token: string, compact = true) =>
  TIME.test(token) || TWELVE.test(token) || (compact && COMPACT.test(token));
const DURATION = [/^\d+(\.\d+)?h$/i, /^\d+m$/i, /^\d+h\d{1,2}m?$/i];

const isDuration = (token: string) => DURATION.some((re) => re.test(token));

/** A start token: a clock time, now, or +<duration>; optionally `-<clock>` for a range. */
function startToken(token: string): { ok: boolean; range: boolean } {
  const [start, ...end] = token.split('-');
  const startOk = isClock(start) || start.toLowerCase() === 'now'
    || (start.startsWith('+') && isDuration(start.slice(1)));
  if (!startOk || end.length > 1) return { ok: false, range: false };
  if (end.length === 1) return { ok: isClock(end[0]), range: true };
  return { ok: true, range: false };
}

function describe(p: Placeholder): string {
  const options = p.resolved_options ?? p.options;
  const def = String(p.default);
  return options && options.length ? `${p.key} (${def}: ${options.join(' / ')})` : `${p.key} (${def})`;
}

export function hintFor(line: string, templates: Template[]): string | null {
  const trimmed = line.trimStart();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const typingKey = tokens.length === 1 && !/\s$/.test(trimmed);
  const folded = tokens[0].toLocaleLowerCase();

  if (typingKey) {
    const keys = templates.map((t) => t.key).filter((k) => k.toLocaleLowerCase().startsWith(folded));
    return keys.length ? keys.join(' · ') : 'unknown template';
  }

  const template = templates.find((t) => t.key.toLocaleLowerCase() === folded);
  if (!template) return 'unknown template';
  if (tokens.length < 2) return null;
  const start = startToken(tokens[1]);
  if (!start.ok) return null;

  let rest = tokens.slice(2);
  if (!start.range && rest.length && (isDuration(rest[0]) || isClock(rest[0], false))) rest = rest.slice(1);
  const named = new Set(
    rest.filter((t) => t.includes('=')).map((t) => t.split('=', 1)[0].toLocaleLowerCase()),
  );
  const positional = rest.filter((t) => !t.includes('=')).length;
  const remaining = template.placeholders.filter(
    (p, i) => i >= positional && !named.has(p.key.toLocaleLowerCase()),
  );
  return remaining.length ? remaining.map(describe).join(' · ') : null;
}

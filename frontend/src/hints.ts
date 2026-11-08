/**
 * The hint under the text box, for the line the cursor is on.
 *
 * A convenience only: the backend's preview is the authority on what a
 * line means. The token rules mirror custom_components/.../parse.py.
 */
import type { Placeholder, Template } from './types';

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DURATION = [/^\d+(\.\d+)?h$/i, /^\d+m$/i, /^\d+h\d{1,2}m?$/i];

const isDuration = (token: string) => DURATION.some((re) => re.test(token));

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
  if (tokens.length < 2 || !TIME.test(tokens[1])) return null;

  let rest = tokens.slice(2);
  if (rest.length && isDuration(rest[0])) rest = rest.slice(1);
  const named = new Set(
    rest.filter((t) => t.includes('=')).map((t) => t.split('=', 1)[0].toLocaleLowerCase()),
  );
  const positional = rest.filter((t) => !t.includes('=')).length;
  const remaining = template.placeholders.filter(
    (p, i) => i >= positional && !named.has(p.key.toLocaleLowerCase()),
  );
  return remaining.length ? remaining.map(describe).join(' · ') : null;
}

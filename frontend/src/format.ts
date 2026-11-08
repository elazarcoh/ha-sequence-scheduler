/** Time formatting in Home Assistant's own time zone, never the browser's. */

function parts(iso: string, timeZone: string | undefined) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function hhmm(iso: string, timeZone?: string): string {
  return parts(iso, timeZone).time;
}

/** 'today', 'tomorrow', or the date, relative to `nowIso` in `timeZone`. */
export function dayLabel(iso: string, nowIso: string, timeZone?: string): string {
  const day = parts(iso, timeZone).day;
  const today = parts(nowIso, timeZone).day;
  if (day === today) return 'today';
  const tomorrow = parts(new Date(new Date(nowIso).getTime() + 86_400_000).toISOString(), timeZone).day;
  return day === tomorrow ? 'tomorrow' : day;
}

export function formatValues(values: Record<string, unknown>): string {
  return Object.values(values).map(String).join(' · ');
}

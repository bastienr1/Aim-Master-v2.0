export function getWeekBoundsInTz(tz: string, ref?: Date): { start: string; end: string } {
  const now = ref ?? new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(now);

  const y = parseInt(parts.find(p => p.type === 'year')!.value);
  const m = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
  const d = parseInt(parts.find(p => p.type === 'day')!.value);
  const wd = parts.find(p => p.type === 'weekday')!.value;

  const offsets: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const off = offsets[wd] ?? 0;

  const mon = new Date(y, m, d - off);
  const monStr = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}T00:00:00`;

  const sun = new Date(y, m, d - off + 6);
  const sunStr = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}T23:59:59`;

  return { start: toUTC(monStr, tz), end: toUTC(sunStr, tz) };
}

function toUTC(localStr: string, tz: string): string {
  const d = new Date(localStr);
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const local = new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime();
  return new Date(d.getTime() + (utc - local)).toISOString();
}

export function todayInTz(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

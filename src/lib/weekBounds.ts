// src/lib/weekBounds.ts
// Training week: Monday–Friday | Saturday: recap generation | Sunday: goal setting
// IMPORTANT: All date strings use LOCAL time, not UTC, to avoid timezone mismatches
// between the browser (e.g. SGT UTC+8) and Supabase (UTC).

export interface WeekBounds {
  start: string; // ISO string, Monday 00:00:00
  end: string;   // ISO string, Friday 23:59:59
}

/**
 * Format a Date as YYYY-MM-DD in LOCAL time (not UTC).
 * This is critical — toISOString() converts to UTC which shifts the date
 * for users east of Greenwich (e.g. Singapore: Mon 7am SGT = Sun 11pm UTC).
 */
function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get this week's Monday as a Date (in local time, midnight).
 * Uses the Date constructor with local date parts to avoid UTC drift.
 */
function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat — LOCAL time
  const diffToMonday = day === 0 ? -6 : 1 - day;
  // Using (year, month, date) constructor gives local midnight — no UTC shift
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  return monday;
}

/**
 * Get current TRAINING week boundaries (Monday through Friday).
 * AimMaster training week = Mon–Fri. Saturday = recap. Sunday = goal setting.
 * Returns ISO strings suitable for Supabase .gte() / .lte() filters.
 */
export function getCurrentWeekBounds(): WeekBounds {
  const monday = getThisMonday();

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Mon + 4 = Fri
  friday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString(),
    end: friday.toISOString(),
  };
}

/**
 * Get last training week's Monday as a Date and YYYY-MM-DD string.
 * "Last training week" = the Mon–Fri block that most recently completed.
 *
 * On Saturday: returns THIS week's Monday (training week just ended Friday).
 * On Sun–Fri: returns PREVIOUS week's Monday.
 *
 * The returned dateStr is in LOCAL time format (YYYY-MM-DD) to match
 * Supabase DATE columns which store dates without timezone.
 */
export function getLastTrainingWeekMonday(): { dateStr: string; date: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat — LOCAL time
  const thisMonday = getThisMonday();

  let targetMonday: Date;

  if (day === 6) {
    // Saturday (recap day): "last training week" = THIS Monday through yesterday (Fri)
    targetMonday = new Date(thisMonday);
  } else {
    // Sun–Fri: "last training week" = PREVIOUS Monday through its Friday
    targetMonday = new Date(thisMonday);
    targetMonday.setDate(thisMonday.getDate() - 7);
  }

  // Use LOCAL date string — NOT toISOString() which converts to UTC
  return { dateStr: toLocalDateStr(targetMonday), date: targetMonday };
}

/**
 * Format a week range for display.
 * Mon–Fri same month: "Mar 17 – 21"
 * Mon–Fri across months: "Feb 24 – Mar 1"
 */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  // Append T00:00:00 to prevent UTC interpretation of date-only strings
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekEnd + 'T00:00:00');
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

/**
 * Get ISO week number from a date string.
 */
export function getISOWeekNumber(dateStr: string): number {
  // Append T00:00:00 to prevent UTC interpretation
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

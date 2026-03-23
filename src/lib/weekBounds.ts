// src/lib/weekBounds.ts
// Training week: Monday–Friday | Saturday: recap generation | Sunday: goal setting

export interface WeekBounds {
  start: string; // ISO string, Monday 00:00:00
  end: string;   // ISO string, Friday 23:59:59
}

/**
 * Get current TRAINING week boundaries (Monday through Friday).
 * AimMaster training week = Mon–Fri. Saturday = recap. Sunday = goal setting.
 * Returns ISO strings suitable for Supabase .gte() / .lte() filters.
 */
export function getCurrentWeekBounds(): WeekBounds {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

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
 * "Last training week" = the Mon–Fri block from the previous week.
 * On Saturday: returns THIS week's Monday (the training week that just ended Friday).
 * On Sun–Fri: returns PREVIOUS week's Monday.
 */
export function getLastTrainingWeekMonday(): { dateStr: string; date: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Get THIS week's Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  let targetMonday: Date;

  if (day === 6) {
    // Saturday (recap day): "last training week" = THIS Monday through yesterday (Fri)
    targetMonday = new Date(thisMonday);
  } else {
    // Sun–Fri: "last training week" = PREVIOUS Monday through its Friday
    targetMonday = new Date(thisMonday);
    targetMonday.setDate(thisMonday.getDate() - 7);
  }

  const dateStr = targetMonday.toISOString().split('T')[0];
  return { dateStr, date: targetMonday };
}

/**
 * Format a week range for display.
 * Mon–Fri same month: "Mar 17 – 21"
 * Mon–Fri across months: "Feb 24 – Mar 1"
 */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
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
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

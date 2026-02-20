import { formatDistanceToNow, parseISO } from 'date-fns';

export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#9CA8B3';
  const lower = category.toLowerCase();
  if (lower.includes('click') || lower.includes('flick')) return '#FF4655';
  if (lower.includes('track')) return '#53CADC';
  if (lower.includes('switch')) return '#FFCA3A';
  return '#9CA8B3';
}

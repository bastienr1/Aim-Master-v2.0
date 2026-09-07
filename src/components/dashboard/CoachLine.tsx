import { TEXT, FONT } from '@/constants/theme';

interface CoachLineProps {
  /** The momentum coaching sentence. Nothing renders when empty. */
  text: string | null | undefined;
}

/** Long copy is trimmed to its first sentence — the row under the tiles is one line. */
function firstSentence(text: string, limit = 110): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > 40 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

/** One muted sentence of coaching, directly under the Signals row. */
export function CoachLine({ text }: CoachLineProps) {
  if (!text?.trim()) return null;

  return (
    <p
      style={{
        fontFamily: FONT.body,
        fontSize: '12px',
        color: TEXT.label,
        lineHeight: 1.5,
        marginTop: '6px',
      }}
    >
      <b style={{ color: TEXT.body, fontWeight: 600 }}>Coach:</b> {firstSentence(text.trim())}
    </p>
  );
}

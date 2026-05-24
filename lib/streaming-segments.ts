/**
 * Split a (possibly-streaming) interpretation text into segments for staggered fade-in.
 *
 * Rules:
 * - Segments break at Chinese sentence terminators 。！？ (terminator attached to the
 *   preceding segment) and at explicit newlines (\n).
 * - Each segment is trimmed of surrounding whitespace.
 * - Empty segments produced by consecutive boundaries are dropped.
 * - A trailing fragment without a terminator (the in-progress sentence during streaming)
 *   is returned as the final segment.
 * - Streaming-stable: appending more characters to the input only changes the trailing
 *   segment (or adds new ones). Already-finalized segments are never reshuffled, so
 *   React keys remain stable and fade-in animations don't re-trigger on old text.
 */
export function splitInterpretationSegments(text: string): string[] {
  if (!text) return []

  const segments: string[] = []
  let buffer = ''

  for (const ch of text) {
    if (ch === '\n') {
      const trimmed = buffer.trim()
      if (trimmed) segments.push(trimmed)
      buffer = ''
      continue
    }
    buffer += ch
    if (ch === '。' || ch === '！' || ch === '？') {
      const trimmed = buffer.trim()
      if (trimmed) segments.push(trimmed)
      buffer = ''
    }
  }

  const tail = buffer.trim()
  if (tail) segments.push(tail)

  return segments
}

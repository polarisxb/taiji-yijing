/**
 * Split a (possibly-streaming) interpretation text into paragraphs of sentences,
 * for paragraph-aware staggered fade-in rendering.
 *
 * Why two levels:
 * - Paragraphs (split on \n) preserve the multi-section structure that the AI
 *   prompt asks for ("先引经文，再释义，再映射用户情境，最后给建议"). The renderer puts
 *   each paragraph in its own block, restoring vertical breaks.
 * - Sentences within a paragraph (split on 。！？) enable per-sentence fade-in
 *   animation without re-triggering animation on already-rendered prefix.
 *
 * Rules:
 * - Outer array = paragraphs, inner arrays = sentences in source order.
 * - Sentence terminators 。！？ are attached to the preceding sentence.
 * - Each sentence is trimmed of surrounding whitespace.
 * - Empty sentences (produced by consecutive terminators) are dropped.
 * - Empty paragraphs (produced by blank lines) are dropped.
 * - A trailing fragment without a terminator (the in-progress sentence during
 *   streaming) is returned as the final sentence of the last paragraph.
 * - Streaming-stable: appending more characters to the input only changes the
 *   trailing sentence (or adds new ones / new paragraphs). Already-finalized
 *   sentences are never reshuffled, so React keys remain stable and fade-in
 *   animations don't re-trigger on old text.
 */
export function splitInterpretationParagraphs(text: string): string[][] {
  if (!text) return []

  const paragraphs: string[][] = []
  let currentPara: string[] = []
  let buffer = ''

  const flushSentence = () => {
    const trimmed = buffer.trim()
    // 跳过纯标点的退化句（如连续终止符 "。。" 产生的第二个 "。"）
    if (trimmed && /[^。！？\s]/.test(trimmed)) currentPara.push(trimmed)
    buffer = ''
  }

  const flushParagraph = () => {
    flushSentence()
    if (currentPara.length > 0) paragraphs.push(currentPara)
    currentPara = []
  }

  for (const ch of text) {
    if (ch === '\n') {
      flushParagraph()
      continue
    }
    buffer += ch
    if (ch === '。' || ch === '！' || ch === '？') {
      flushSentence()
    }
  }

  flushParagraph()

  return paragraphs
}

/**
 * Match @Character Names in narrator text for highlight.
 * Uses Unicode properties so Vietnamese (Latin Extended Additional: ế, ẹ, ư, Đ, …)
 * and other Latin diacritics are not cut off mid-name (e.g. @Vương Thiết Sẹo).
 */
// Capturing group so String.split keeps @mentions in the result array
export const MENTION_SPLIT_REGEX =
  /(@\p{Lu}[\p{L}\p{M}'-]*(?:\s+\p{Lu}[\p{L}\p{M}'-]*)*)/u

/** Strip internal tags: [ITEM_ADD:...], [Combat:...] (PascalCase or SCREAMING_SNAKE). */
export const INTERNAL_TAG_STRIP_REGEX =
  /\[[A-Za-z_][A-Za-z0-9_]*:[^\]]+\]/g

/**
 * Remove streamed control payloads like [POWER]{...json...} from visible narrative.
 * (Same family as [INVENTORY]{...} but those are stripped before onChunk; POWER can
 * arrive concatenated with prose in one SSE data block.)
 */
export function stripPowerControlTags(s) {
  if (!s || typeof s !== 'string') return s
  let out = s
  const marker = '[POWER]'
  let guard = 0
  while (guard++ < 50) {
    const start = out.indexOf(marker)
    if (start === -1) break
    let i = start + marker.length
    while (i < out.length && /\s/.test(out[i])) i += 1
    if (i >= out.length || out[i] !== '{') {
      out = out.slice(0, start) + out.slice(start + marker.length)
      continue
    }
    let depth = 0
    const jsonStart = i
    for (; i < out.length; i += 1) {
      const c = out[i]
      if (c === '{') depth += 1
      else if (c === '}') {
        depth -= 1
        if (depth === 0) {
          i += 1
          break
        }
      }
    }
    const jsonStr = out.slice(jsonStart, i)
    try {
      JSON.parse(jsonStr)
    } catch {
      out = out.slice(0, start) + out.slice(start + marker.length)
      continue
    }
    out = out.slice(0, start) + out.slice(i)
  }
  return out
}

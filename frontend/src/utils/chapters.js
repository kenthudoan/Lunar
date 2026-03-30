/**
 * Chapters are user-turn boundaries into the flat `messages` array.
 * Each chapter: { id, fromIndex } — slice is messages[fromIndex .. nextChapter.fromIndex)
 * Chapter 0 is always the opening narrative (fromIndex: -1, rendered separately).
 */

export function buildChaptersFromMessages(msgs) {
  const out = [{ id: 'ch-opening', fromIndex: -1 }]
  if (!msgs?.length) return out
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role === 'user') {
      out.push({ id: `ch-${i}`, fromIndex: i })
    }
  }
  return out
}

export function sliceMessagesForChapter(messages, chapters, chapterId) {
  if (!chapters?.length || !chapterId) return []
  const idx = chapters.findIndex((c) => c.id === chapterId)
  if (idx === -1) return []
  if (chapterId === 'ch-opening') return [] // opening rendered separately
  const start = chapters[idx].fromIndex
  const end = chapters[idx + 1] ? chapters[idx + 1].fromIndex : messages.length
  return messages.slice(start, end)
}

/** Format [PLOT_AUTO] injection payload as markdown for the transcript. */
export function formatAutoPlotMessage(plot) {
  const kind = String(plot?.kind || '').toLowerCase()
  const data = plot?.data || {}
  if (kind === 'npc') {
    return [
      `### ${data.name || 'Unknown'} (Power ${data.power_level || 5}/10)`,
      data.appearance || '',
      data.goal ? `**Goal:** ${data.goal}` : '',
      data.secret ? `**Secret:** ${data.secret}` : '',
    ].filter(Boolean).join('\n\n')
  }
  if (kind === 'event') {
    const choices = Array.isArray(data.choices) ? data.choices.map((c, i) => `${i + 1}. ${c}`).join('\n') : ''
    return [
      `### ${data.title || 'Unexpected Event'}`,
      data.description || '',
      choices ? `**Choices:**\n${choices}` : '',
    ].filter(Boolean).join('\n\n')
  }
  return typeof data === 'string' ? data : (data.text || 'A new plot branch emerges.')
}

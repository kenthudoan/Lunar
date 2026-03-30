import ReactMarkdown from 'react-markdown'

function processChildren(children) {
  if (typeof children !== 'string') return children
  const parts = children.split(/(@[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*(?:\s+[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*)*)/g)
  if (parts.length === 1) return children
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-indigo-400 font-medium" title={part.slice(1)}>{part}</span>
      : part
  )
}

const mentionComponents = {
  p: ({ children }) => <p>{processChildren(children)}</p>,
  li: ({ children }) => <li>{processChildren(children)}</li>,
  em: ({ children }) => <em>{processChildren(children)}</em>,
  strong: ({ children }) => <strong>{processChildren(children)}</strong>,
}

export default function NarrativeBlock({ content, isStreaming = false, combatMode = false }) {
  const cleaned = content
    .replace(/\[ITEM_ADD:[^\]]+\]/g, '')
    .replace(/\[ITEM_USE:[^\]]+\]/g, '')
    .replace(/\[ITEM_LOSE:[^\]]+\]/g, '')

  return (
    <div className="prose-lunar">
      <ReactMarkdown components={mentionComponents}>{cleaned}</ReactMarkdown>
      {isStreaming && (
        <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-pulse ${combatMode ? 'bg-[var(--combat-text)]' : 'bg-[var(--accent)] opacity-50'}`} />
      )}
    </div>
  )
}

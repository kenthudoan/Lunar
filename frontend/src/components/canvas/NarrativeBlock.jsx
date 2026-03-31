import ReactMarkdown from 'react-markdown'
import { MENTION_SPLIT_REGEX, INTERNAL_TAG_STRIP_REGEX, stripPowerControlTags } from '../../utils/mentionRegex'

function processChildren(children) {
  if (typeof children !== 'string') return children
  const parts = children.split(MENTION_SPLIT_REGEX)
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
  const cleaned = stripPowerControlTags(String(content || '')).replace(INTERNAL_TAG_STRIP_REGEX, '')

  return (
    <div className="prose-lunar">
      <ReactMarkdown components={mentionComponents}>{cleaned}</ReactMarkdown>
      {isStreaming && (
        <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-pulse ${combatMode ? 'bg-[var(--combat-text)]' : 'bg-[var(--accent)] opacity-50'}`} />
      )}
    </div>
  )
}

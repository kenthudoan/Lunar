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
  const cursor = isStreaming ? (
    <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-cursor ${combatMode ? 'bg-[var(--combat-text)]' : 'bg-[var(--accent)]'}`} />
  ) : null

  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean)

  if (paragraphs.length === 0) {
    return (
      <div className="prose-lunar">
        {cursor}
      </div>
    )
  }

  const lastIdx = paragraphs.length - 1
  return (
    <div className="prose-lunar">
      {paragraphs.map((para, i) => {
        if (i < lastIdx) {
          return <p key={i}>{processChildren(para)}</p>
        }
        return <p key={i}>{processChildren(para)}{cursor}</p>
      })}
    </div>
  )
}

import type { Message } from '../../types/session'
import { TextBlock as TextBlockComp } from '../blocks/TextBlock'
import { ToolInteractionBlock as ToolInteractionBlockComp } from '../blocks/ToolInteractionBlock'
import { formatCost, formatTokens } from '../../utils/pricing'
import styles from './MessageItem.module.css'

interface Props {
  message: Message
}

function formatTime(ts: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  const hh = d.getUTCHours().toString().padStart(2, '0')
  const mm = d.getUTCMinutes().toString().padStart(2, '0')
  const ss = d.getUTCSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function MessageItem({ message }: Props) {
  const isUser = message.role === 'user'
  const u = message.usage

  return (
    <div className={isUser ? styles.msgUser : styles.msgAssistant}>
      <div className={styles.header}>
        <span className={`${styles.roleLabel} ${isUser ? styles.roleLabelUser : styles.roleLabelAssistant}`}>
          {isUser ? 'User' : 'Claude'}
        </span>
        {u && (
          <span className={styles.usageWrap}>
            <span className={styles.usage}>
              {formatTokens(u.inputTokens + u.outputTokens)} tok · {formatCost(u.estimatedCost)}
            </span>
            <span className={styles.usageTooltip}>
              <span>in: {u.inputTokens.toLocaleString()}</span>
              <span>out: {u.outputTokens.toLocaleString()}</span>
              <span>cache read: {u.cacheReadTokens.toLocaleString()}</span>
              <span>cache write: {u.cacheCreationTokens.toLocaleString()}</span>
            </span>
          </span>
        )}
        <span className={styles.timestamp} title={message.timestamp}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className={styles.body}>
        {message.blocks.map((block, i) => {
          if (block.type === 'text') return <TextBlockComp key={i} block={block} />
          if (block.type === 'tool_interaction') return <ToolInteractionBlockComp key={i} block={block} />
          return null
        })}
      </div>
    </div>
  )
}

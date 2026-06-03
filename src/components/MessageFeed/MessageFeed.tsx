import type { Message } from '../../types/session'
import { MessageItem } from '../MessageItem/MessageItem'
import styles from './MessageFeed.module.css'

interface Props {
  messages: Message[]
}

export function MessageFeed({ messages }: Props) {
  return (
    <div className={styles.feed}>
      {messages.map(m => (
        <MessageItem key={m.uuid} message={m} />
      ))}
    </div>
  )
}

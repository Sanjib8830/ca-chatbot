import type { ChatMessage } from '../types/chat';

export interface MessageListProps {
  messages: readonly ChatMessage[];
  isPending?: boolean;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function MessageList({ messages, isPending = false }: MessageListProps) {
  return (
    <div className="message-list" role="log" aria-label="Conversation messages" aria-live="polite">
      {messages.length === 0 ? (
        <div className="message-empty">
          <p>Start with a question. The conversation will take shape here.</p>
        </div>
      ) : (
        messages.map((message) => (
          <article className={`message-row ${message.role}`} key={message.id}>
            <span className="message-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
            <p className="message-bubble">{message.content}</p>
            <time className="message-time" dateTime={message.createdAt}>
              {formatTime(message.createdAt)}
            </time>
          </article>
        ))
      )}
      {isPending ? (
        <div className="pending-row" role="status" aria-label="Assistant is thinking">
          <span className="pending-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Thinking through that...</span>
        </div>
      ) : null}
    </div>
  );
}

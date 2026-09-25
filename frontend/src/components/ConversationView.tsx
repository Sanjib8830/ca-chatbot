import type { ChatMessage } from '../types/chat';
import { ErrorState } from './ErrorState';
import { MessageList } from './MessageList';

export interface ConversationViewProps {
  messages: readonly ChatMessage[];
  isPending: boolean;
  errorMessage?: string;
  isRetrying?: boolean;
  onRetry?: () => void | Promise<void>;
}

export function ConversationView({
  messages,
  isPending,
  errorMessage,
  isRetrying = false,
  onRetry
}: ConversationViewProps) {
  return (
    <div className="conversation-view">
      <MessageList messages={messages} isPending={isPending} />
      {errorMessage && onRetry ? (
        <ErrorState message={errorMessage} onRetry={onRetry} isRetrying={isRetrying} />
      ) : null}
    </div>
  );
}

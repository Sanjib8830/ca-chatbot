import { useEffect, useRef, useState } from 'react';
import { ChatApiError, chatApi } from '../services/chatApi';
import type {
  AttemptResponse,
  ChatMessage,
  SubmitQuestionResponse
} from '../types/chat';
import { ConversationView } from '../components/ConversationView';
import { MessageComposer } from '../components/MessageComposer';
import { NewConversationButton } from '../components/NewConversationButton';

const MESSAGE_LENGTH_LIMIT = 2000;
const POLL_INTERVAL_MS = 250;
const MAX_POLL_ATTEMPTS = 60;

type ActiveAttempt = {
  id: string;
  userMessageId: string;
};

type FailedAttempt = ActiveAttempt & {
  error: string;
};

function apiErrorMessage(error: unknown): string {
  if (error instanceof ChatApiError) {
    return error.message;
  }
  return 'The conversation could not be reached. Check the connection and try again.';
}

function createUserMessage(
  conversationId: string,
  response: SubmitQuestionResponse,
  content: string
): ChatMessage {
  return {
    id: response.userMessageId,
    conversationId,
    role: 'user',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    displayStatus: 'sent'
  };
}

function createAssistantMessage(
  conversationId: string,
  response: Extract<AttemptResponse, { state: 'completed' }>
): ChatMessage {
  return {
    id: response.assistantMessageId,
    conversationId,
    role: 'assistant',
    content: response.content,
    createdAt: new Date().toISOString(),
    displayStatus: 'complete'
  };
}

export function ChatPage() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt>();
  const [failedAttempt, setFailedAttempt] = useState<FailedAttempt>();
  const [composerError, setComposerError] = useState('');
  const [pageError, setPageError] = useState('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const mountedRef = useRef(true);
  const currentConversationRef = useRef<string>();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingConversation(true);
    void chatApi.createConversation()
      .then(({ conversationId: nextConversationId }) => {
        if (cancelled || !mountedRef.current) {
          return;
        }
        currentConversationRef.current = nextConversationId;
        setConversationId(nextConversationId);
        setMessages([]);
        setPageError('');
      })
      .catch((error: unknown) => {
        if (!cancelled && mountedRef.current) {
          setPageError(apiErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setIsLoadingConversation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addMessageOnce(message: ChatMessage): void {
    setMessages((currentMessages) =>
      currentMessages.some((currentMessage) => currentMessage.id === message.id)
        ? currentMessages
        : [...currentMessages, message]
    );
  }

  async function pollAttempt(nextConversationId: string, attempt: ActiveAttempt): Promise<void> {
    for (let pollCount = 0; pollCount < MAX_POLL_ATTEMPTS; pollCount += 1) {
      const result = await chatApi.getAttempt(nextConversationId, attempt.id);
      if (!mountedRef.current || currentConversationRef.current !== nextConversationId) {
        return;
      }

      if (result.state === 'pending') {
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      setActiveAttempt(undefined);
      if (result.state === 'completed') {
        addMessageOnce(createAssistantMessage(nextConversationId, result));
        setFailedAttempt(undefined);
      } else {
        setFailedAttempt({ ...attempt, error: result.error });
      }
      return;
    }

    if (mountedRef.current && currentConversationRef.current === nextConversationId) {
      setActiveAttempt(undefined);
      setFailedAttempt({
        ...attempt,
        error: 'The assistant is taking longer than expected. Please try again.'
      });
    }
  }

  async function handleSubmit(content: string): Promise<boolean> {
    if (!conversationId) {
      setComposerError('A conversation is still starting. Try again in a moment.');
      return false;
    }

    setComposerError('');
    setPageError('');
    try {
      const response = await chatApi.submitQuestion(conversationId, content);
      const userMessage = createUserMessage(conversationId, response, content);
      addMessageOnce(userMessage);
      const attempt = {
        id: response.responseAttemptId,
        userMessageId: response.userMessageId
      };
      setFailedAttempt(undefined);

      if (response.state === 'completed') {
        addMessageOnce({
          id: response.assistantMessageId,
          conversationId,
          role: 'assistant',
          content: response.content,
          createdAt: new Date().toISOString(),
          displayStatus: 'complete'
        });
      } else {
        setActiveAttempt(attempt);
        void pollAttempt(conversationId, attempt).catch((error: unknown) => {
          if (mountedRef.current) {
            setActiveAttempt(undefined);
            setFailedAttempt({ ...attempt, error: apiErrorMessage(error) });
          }
        });
      }
      return true;
    } catch (error) {
      setComposerError(apiErrorMessage(error));
      return false;
    }
  }

  async function handleRetry(): Promise<void> {
    if (!conversationId || !failedAttempt) {
      return;
    }

    setIsRetrying(true);
    setPageError('');
    setFailedAttempt(undefined);
    setActiveAttempt(failedAttempt);
    try {
      const response = await chatApi.retryAttempt(conversationId, failedAttempt.id);
      const attempt = {
        id: response.responseAttemptId,
        userMessageId: response.userMessageId
      };
      if (response.state === 'completed') {
        setActiveAttempt(undefined);
        addMessageOnce({
          id: response.assistantMessageId,
          conversationId,
          role: 'assistant',
          content: response.content,
          createdAt: new Date().toISOString(),
          displayStatus: 'complete'
        });
      } else {
        setActiveAttempt(attempt);
        void pollAttempt(conversationId, attempt).catch((error: unknown) => {
          if (mountedRef.current) {
            setActiveAttempt(undefined);
            setFailedAttempt({ ...attempt, error: apiErrorMessage(error) });
          }
        });
      }
    } catch (error) {
      setActiveAttempt(undefined);
      setFailedAttempt({ ...failedAttempt, error: apiErrorMessage(error) });
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleNewConversation(): Promise<void> {
    setIsCreatingConversation(true);
    try {
      const { conversationId: nextConversationId } = await chatApi.createConversation();
      currentConversationRef.current = nextConversationId;
      setConversationId(nextConversationId);
      setMessages([]);
      setActiveAttempt(undefined);
      setFailedAttempt(undefined);
      setComposerError('');
      setPageError('');
    } catch (error) {
      setPageError(apiErrorMessage(error));
    } finally {
      setIsCreatingConversation(false);
    }
  }

  const isPending = Boolean(activeAttempt);
  const statusLabel = isLoadingConversation
    ? 'Starting'
    : isPending
      ? 'Thinking'
      : failedAttempt
        ? 'Needs attention'
        : 'Ready';

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">CA</div>
          <div>
            <p className="brand-name">Ca Chatbot</p>
            <p className="brand-note">A calm place to think out loud</p>
          </div>
        </div>
        <NewConversationButton
          disabled={isCreatingConversation || isLoadingConversation}
          onClick={handleNewConversation}
        />
      </header>

      <main className="chat-main">
        <section className="chat-intro" aria-labelledby="chat-title">
          <p className="chat-kicker">Conversation, considered</p>
          <h1 className="chat-title" id="chat-title">Bring a question.<br />Leave with a little more clarity.</h1>
          <p className="chat-subtitle">
            Ask a question, follow the thread, and keep the useful parts of the exchange close at hand.
          </p>
          <div className="chat-meta" aria-label="Conversation details">
            <div className="chat-meta-item"><span>Mode</span><strong>Text conversation</strong></div>
            <div className="chat-meta-item"><span>Context</span><strong>Current thread</strong></div>
          </div>
        </section>

        <section className="conversation-panel" aria-labelledby="conversation-label" aria-busy={isLoadingConversation || isPending}>
          <div className="conversation-toolbar">
            <p className="conversation-label" id="conversation-label">Your conversation</p>
            <span className="conversation-status">{statusLabel}</span>
          </div>
          {pageError ? <p className="sr-only" role="alert">{pageError}</p> : null}
          <ConversationView
            messages={messages}
            isPending={isPending}
            errorMessage={failedAttempt?.error}
            isRetrying={isRetrying}
            onRetry={handleRetry}
          />
          <MessageComposer
            maxLength={MESSAGE_LENGTH_LIMIT}
            disabled={isLoadingConversation || isPending || isCreatingConversation}
            externalError={composerError}
            onSubmit={handleSubmit}
          />
        </section>
      </main>
    </div>
  );
}

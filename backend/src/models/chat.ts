export type ConversationStatus = 'active';
export type MessageRole = 'user' | 'assistant';
export type MessageDisplayStatus = 'sent' | 'pending' | 'complete' | 'failed';
export type ResponseState = 'pending' | 'completed' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  displayStatus: MessageDisplayStatus;
}

export interface ResponseAttempt {
  id: string;
  conversationId: string;
  triggeringMessageId: string;
  state: ResponseState;
  resultingMessageId?: string;
  errorSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  messages: Message[];
}

export interface ChatContextMessage {
  role: MessageRole;
  content: string;
}

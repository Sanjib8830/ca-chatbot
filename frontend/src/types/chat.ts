export type MessageRole = 'user' | 'assistant';
export type MessageDisplayStatus = 'sent' | 'pending' | 'complete' | 'failed';
export type ResponseState = 'pending' | 'completed' | 'failed';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  displayStatus: MessageDisplayStatus;
}

export interface Conversation {
  conversationId: string;
  messages: ChatMessage[];
}

export interface NewConversationResponse {
  conversationId: string;
}

export interface PendingSubmission {
  responseAttemptId: string;
  userMessageId: string;
  state: 'pending';
}

export interface CompletedSubmission {
  responseAttemptId: string;
  userMessageId: string;
  assistantMessageId: string;
  state: 'completed';
  content: string;
}

export type SubmitQuestionResponse = PendingSubmission | CompletedSubmission;

export interface AttemptPendingResponse {
  responseAttemptId: string;
  state: 'pending';
}

export interface AttemptCompletedResponse {
  responseAttemptId: string;
  state: 'completed';
  assistantMessageId: string;
  content: string;
}

export interface AttemptFailedResponse {
  responseAttemptId: string;
  state: 'failed';
  error: string;
}

export type AttemptResponse =
  | AttemptPendingResponse
  | AttemptCompletedResponse
  | AttemptFailedResponse;

export interface ApiErrorPayload {
  error: string;
}

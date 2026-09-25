import type {
  ApiErrorPayload,
  AttemptResponse,
  NewConversationResponse,
  SubmitQuestionResponse
} from '../types/chat';

export class ChatApiError extends Error {
  public readonly status: number;
  public readonly payload?: ApiErrorPayload;

  public constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.payload = payload;
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  );
}

export class ChatApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  public constructor(baseUrl = '/api', fetcher: FetchLike = window.fetch.bind(window)) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetcher = fetcher;
  }

  public createConversation(): Promise<NewConversationResponse> {
    return this.request<NewConversationResponse>('/conversations', { method: 'POST' });
  }

  public submitQuestion(
    conversationId: string,
    content: string
  ): Promise<SubmitQuestionResponse> {
    return this.request<SubmitQuestionResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
  }

  public getAttempt(
    conversationId: string,
    responseAttemptId: string
  ): Promise<AttemptResponse> {
    return this.request<AttemptResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(responseAttemptId)}`,
      { method: 'GET' }
    );
  }

  public retryAttempt(
    conversationId: string,
    responseAttemptId: string
  ): Promise<SubmitQuestionResponse> {
    return this.request<SubmitQuestionResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(responseAttemptId)}/retry`,
      { method: 'POST' }
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      const message = isApiErrorPayload(payload)
        ? payload.error
        : 'The request could not be completed.';
      throw new ChatApiError(message, response.status, isApiErrorPayload(payload) ? payload : undefined);
    }

    return payload as T;
  }
}

export const chatApi = new ChatApiClient();

import { randomUUID } from 'node:crypto';
import type { RuntimeConfig } from '../config/env.js';
import type {
  ChatContextMessage,
  Conversation,
  Message,
  ResponseAttempt
} from '../models/chat.js';
import type { LlmService } from './llmService.js';

export interface ConversationServiceOptions {
  config: RuntimeConfig;
  llmService: LlmService;
  idFactory?: () => string;
  now?: () => string;
}

export type SubmitResult =
  | { kind: 'not_found' }
  | { kind: 'validation_error'; error: string }
  | { kind: 'accepted'; attempt: ResponseAttempt; userMessage: Message };

export type RetryResult =
  | { kind: 'not_found' }
  | { kind: 'invalid_state'; error: string }
  | { kind: 'accepted'; attempt: ResponseAttempt; userMessage: Message };

export type AttemptResult =
  | { kind: 'not_found' }
  | {
      kind: 'found';
      attempt: ResponseAttempt;
      userMessage: Message;
      assistantMessage?: Message;
    };

export class ConversationService {
  private readonly conversations = new Map<string, Conversation>();
  private readonly attempts = new Map<string, ResponseAttempt>();
  private readonly config: RuntimeConfig;
  private readonly llmService: LlmService;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  public constructor(options: ConversationServiceOptions) {
    this.config = options.config;
    this.llmService = options.llmService;
    this.idFactory = options.idFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  public createConversation(): Conversation {
    const conversation: Conversation = {
      id: this.idFactory(),
      status: 'active',
      messages: []
    };
    this.conversations.set(conversation.id, conversation);
    return this.copyConversation(conversation);
  }

  public getConversation(conversationId: string): Conversation | undefined {
    const conversation = this.conversations.get(conversationId);
    return conversation ? this.copyConversation(conversation) : undefined;
  }

  public submitQuestion(conversationId: string, content: string): SubmitResult {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { kind: 'not_found' };
    }

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return {
        kind: 'validation_error',
        error: 'Enter a question before sending it.'
      };
    }

    if (normalizedContent.length > this.config.messageLengthLimit) {
      return {
        kind: 'validation_error',
        error: `Keep your question to ${this.config.messageLengthLimit} characters or fewer.`
      };
    }

    const duplicate = this.findPendingAttempt(conversation, normalizedContent);
    if (duplicate) {
      const userMessage = conversation.messages.find(
        (message) => message.id === duplicate.triggeringMessageId
      );
      if (userMessage) {
        return { kind: 'accepted', attempt: this.copyAttempt(duplicate), userMessage: { ...userMessage } };
      }
    }

    const userMessage: Message = {
      id: this.idFactory(),
      conversationId,
      role: 'user',
      content: normalizedContent,
      createdAt: this.now(),
      displayStatus: 'sent'
    };
    conversation.messages.push(userMessage);

    const timestamp = this.now();
    const attempt: ResponseAttempt = {
      id: this.idFactory(),
      conversationId,
      triggeringMessageId: userMessage.id,
      state: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.attempts.set(attempt.id, attempt);
    void this.processAttempt(conversation, attempt);

    return { kind: 'accepted', attempt: this.copyAttempt(attempt), userMessage: { ...userMessage } };
  }

  public getAttempt(conversationId: string, attemptId: string): AttemptResult {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.conversationId !== conversationId) {
      return { kind: 'not_found' };
    }

    const conversation = this.conversations.get(conversationId);
    const userMessage = conversation?.messages.find(
      (message) => message.id === attempt.triggeringMessageId
    );
    if (!conversation || !userMessage) {
      return { kind: 'not_found' };
    }

    const assistantMessage = attempt.resultingMessageId
      ? conversation.messages.find((message) => message.id === attempt.resultingMessageId)
      : undefined;

    return {
      kind: 'found',
      attempt: this.copyAttempt(attempt),
      userMessage: { ...userMessage },
      assistantMessage: assistantMessage ? { ...assistantMessage } : undefined
    };
  }

  public retryAttempt(conversationId: string, attemptId: string): RetryResult {
    const attempt = this.attempts.get(attemptId);
    const conversation = this.conversations.get(conversationId);
    if (!attempt || !conversation || attempt.conversationId !== conversationId) {
      return { kind: 'not_found' };
    }

    if (attempt.state !== 'failed') {
      return {
        kind: 'invalid_state',
        error: 'Only a failed response can be retried.'
      };
    }

    const userMessage = conversation.messages.find(
      (message) => message.id === attempt.triggeringMessageId
    );
    if (!userMessage) {
      return { kind: 'not_found' };
    }

    attempt.state = 'pending';
    attempt.errorSummary = undefined;
    attempt.updatedAt = this.now();
    void this.processAttempt(conversation, attempt);

    return {
      kind: 'accepted',
      attempt: this.copyAttempt(attempt),
      userMessage: { ...userMessage }
    };
  }

  private findPendingAttempt(
    conversation: Conversation,
    content: string
  ): ResponseAttempt | undefined {
    return [...this.attempts.values()].find((attempt) => {
      if (attempt.conversationId !== conversation.id || attempt.state !== 'pending') {
        return false;
      }

      const userMessage = conversation.messages.find(
        (message) => message.id === attempt.triggeringMessageId
      );
      return userMessage?.content === content;
    });
  }

  private async processAttempt(
    conversation: Conversation,
    attempt: ResponseAttempt
  ): Promise<void> {
    const context: ChatContextMessage[] = conversation.messages.map(({ role, content }) => ({
      role,
      content
    }));
    const result = await this.llmService.generateResponse(context);

    if (attempt.state !== 'pending') {
      return;
    }

    attempt.updatedAt = this.now();
    if (!result.ok) {
      attempt.state = 'failed';
      attempt.errorSummary = result.failure.message;
      return;
    }

    const assistantMessage: Message = {
      id: this.idFactory(),
      conversationId: conversation.id,
      role: 'assistant',
      content: result.content,
      createdAt: this.now(),
      displayStatus: 'complete'
    };
    conversation.messages.push(assistantMessage);
    attempt.state = 'completed';
    attempt.resultingMessageId = assistantMessage.id;
  }

  private copyAttempt(attempt: ResponseAttempt): ResponseAttempt {
    return { ...attempt };
  }

  private copyConversation(conversation: Conversation): Conversation {
    return {
      ...conversation,
      messages: conversation.messages.map((message) => ({ ...message }))
    };
  }
}

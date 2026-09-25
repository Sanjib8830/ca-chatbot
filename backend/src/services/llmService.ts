import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RuntimeConfig } from '../config/env.js';
import type { ChatContextMessage } from '../models/chat.js';

export type LlmFailureCode = 'configuration' | 'timeout' | 'provider' | 'empty_response';

export interface LlmFailure {
  code: LlmFailureCode;
  message: string;
}

export type LlmResult =
  | { ok: true; content: string }
  | { ok: false; failure: LlmFailure };

export interface ModelResponse {
  content: unknown;
}

export interface ModelInvoker {
  invoke(messages: BaseMessage[]): Promise<ModelResponse>;
}

export interface LlmService {
  generateResponse(context: readonly ChatContextMessage[]): Promise<LlmResult>;
}

function toText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (typeof part === 'object' && part !== null && 'text' in part) {
        const text = part.text;
        return typeof text === 'string' ? text : '';
      }

      return '';
    })
    .join('')
    .trim();
}

function safeProviderFailure(error: unknown): LlmFailure {
  if (error instanceof Error && /timeout/i.test(error.message)) {
    return {
      code: 'timeout',
      message: 'The assistant took too long to respond. Please try again.'
    };
  }

  return {
    code: 'provider',
    message: 'The assistant could not respond right now. Please try again.'
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('model request timeout')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function toLangChainMessages(context: readonly ChatContextMessage[]): BaseMessage[] {
  return context.map((message) =>
    message.role === 'user'
      ? new HumanMessage(message.content)
      : new AIMessage(message.content)
  );
}

export function createLlmService(
  config: RuntimeConfig,
  injectedClient?: ModelInvoker
): LlmService {
  const client: ModelInvoker | undefined = injectedClient ?? (
    config.googleApiKey
      ? (new ChatGoogleGenerativeAI({
          apiKey: config.googleApiKey,
          model: config.model,
          temperature: 0.2
        }) as unknown as ModelInvoker)
      : undefined
  );

  return {
    async generateResponse(context) {
      if (!client) {
        return {
          ok: false,
          failure: {
            code: 'configuration',
            message: 'The assistant is not configured yet. Please try again later.'
          }
        };
      }

      try {
        const response = await withTimeout(
          client.invoke(toLangChainMessages(context)),
          config.requestTimeoutMs
        );
        const content = toText(response.content);

        if (!content) {
          return {
            ok: false,
            failure: {
              code: 'empty_response',
              message: 'The assistant returned an empty response. Please try again.'
            }
          };
        }

        return { ok: true, content };
      } catch (error) {
        return { ok: false, failure: safeProviderFailure(error) };
      }
    }
  };
}

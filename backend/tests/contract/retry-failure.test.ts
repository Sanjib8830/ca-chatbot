import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createServer } from '../../src/api/server.js';
import { loadRuntimeConfig, type RuntimeConfig } from '../../src/config/env.js';
import { ConversationService } from '../../src/services/conversationService.js';
import { createLlmService, type LlmService, type ModelInvoker } from '../../src/services/llmService.js';

const config: RuntimeConfig = {
  googleApiKey: 'test-only-key',
  model: 'gemma-4-26b-a4b-it',
  messageLengthLimit: 2000,
  requestTimeoutMs: 1000,
  port: 0
};

const servers: Server[] = [];

async function startServer(llmService: LlmService): Promise<{ server: Server; service: ConversationService; baseUrl: string }> {
  const service = new ConversationService({ config, llmService });
  const server = createServer({ config, conversationService: service });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose an address.');
  }
  return { server, service, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function pollAttempt(baseUrl: string, conversationId: string, attemptId: string) {
  for (let count = 0; count < 40; count += 1) {
    const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages/${attemptId}`);
    const body = await response.json() as { state: string; content?: string; error?: string };
    if (body.state !== 'pending') {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for response attempt.');
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    )
  );
});

describe('failed response recovery', () => {
  it('retains the question and retries the same attempt without duplicating it', async () => {
    let calls = 0;
    const llmService: LlmService = {
      async generateResponse() {
        calls += 1;
        if (calls === 1) {
          return {
            ok: false,
            failure: {
              code: 'timeout' as const,
              message: 'The assistant took too long to respond. Please try again.'
            }
          };
        }
        return { ok: true, content: 'Recovered answer.' };
      }
    };
    const { baseUrl, service } = await startServer(llmService);
    const conversationResponse = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const { conversationId } = await conversationResponse.json() as { conversationId: string };
    const questionResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Please keep this question.' })
    });
    const question = await questionResponse.json() as { responseAttemptId: string; userMessageId: string };
    const failed = await pollAttempt(baseUrl, conversationId, question.responseAttemptId);

    expect(failed).toMatchObject({
      state: 'failed',
      error: 'The assistant took too long to respond. Please try again.'
    });
    expect(service.getConversation(conversationId)?.messages).toHaveLength(1);
    expect(service.getConversation(conversationId)?.messages[0]).toMatchObject({
      id: question.userMessageId,
      content: 'Please keep this question.',
      role: 'user'
    });

    const retryResponse = await fetch(
      `${baseUrl}/api/conversations/${conversationId}/messages/${question.responseAttemptId}/retry`,
      { method: 'POST' }
    );
    const retry = await retryResponse.json() as { responseAttemptId: string; userMessageId: string; state: string };
    expect(retryResponse.status).toBe(202);
    expect(retry).toMatchObject({
      responseAttemptId: question.responseAttemptId,
      userMessageId: question.userMessageId,
      state: 'pending'
    });

    const completed = await pollAttempt(baseUrl, conversationId, question.responseAttemptId);
    expect(completed).toMatchObject({ state: 'completed', content: 'Recovered answer.' });
    expect(service.getConversation(conversationId)?.messages).toHaveLength(2);
    expect(calls).toBe(2);
  });
});

describe('LangChain response normalization', () => {
  it('normalizes an empty provider response into an actionable failure', async () => {
    const client: ModelInvoker = {
      async invoke() {
        return { content: [{ kind: 'metadata' }] };
      }
    };
    const service = createLlmService(config, client);

    const result = await service.generateResponse([{ role: 'user', content: 'Hello' }]);

    expect(result).toEqual({
      ok: false,
      failure: {
        code: 'empty_response',
        message: 'The assistant returned an empty response. Please try again.'
      }
    });
  });

  it('normalizes a provider timeout without exposing implementation details', async () => {
    const client: ModelInvoker = {
      invoke: () => new Promise(() => undefined)
    };
    const service = createLlmService({
      ...config,
      requestTimeoutMs: 5
    }, client);

    const result = await service.generateResponse([{ role: 'user', content: 'Hello' }]);

    expect(result).toEqual({
      ok: false,
      failure: {
        code: 'timeout',
        message: 'The assistant took too long to respond. Please try again.'
      }
    });
  });
});

describe('runtime configuration', () => {
  it('uses safe defaults without requiring a credential', () => {
    const configWithoutKey = loadRuntimeConfig({});

    expect(configWithoutKey.googleApiKey).toBeUndefined();
    expect(configWithoutKey.model).toBe('gemma-4-26b-a4b-it');
    expect(configWithoutKey.messageLengthLimit).toBeGreaterThan(0);
    expect(configWithoutKey.requestTimeoutMs).toBeGreaterThan(0);
  });
});

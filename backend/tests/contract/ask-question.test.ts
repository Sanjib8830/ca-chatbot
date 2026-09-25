import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createServer } from '../../src/api/server.js';
import { ConversationService } from '../../src/services/conversationService.js';
import type { RuntimeConfig } from '../../src/config/env.js';
import type { ChatContextMessage } from '../../src/models/chat.js';
import type { LlmService } from '../../src/services/llmService.js';

const config: RuntimeConfig = {
  googleApiKey: 'test-only-key',
  model: 'gemma-4-26b-a4b-it',
  messageLengthLimit: 2000,
  requestTimeoutMs: 1000,
  port: 0
};

const servers: Server[] = [];

async function startTestServer(llmService: LlmService): Promise<{
  server: Server;
  service: ConversationService;
  baseUrl: string;
}> {
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(
      `${baseUrl}/api/conversations/${conversationId}/messages/${attemptId}`
    );
    const body = await response.json() as { state: string; content?: string; error?: string };
    if (body.state !== 'pending') {
      return { response, body };
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

describe('POST /api/conversations', () => {
  it('creates an empty conversation', async () => {
    const llmService: LlmService = {
      async generateResponse() {
        return { ok: true, content: 'unused' };
      }
    };
    const { baseUrl, service } = await startTestServer(llmService);

    const response = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const body = await response.json() as { conversationId: string };

    expect(response.status).toBe(201);
    expect(body.conversationId).toEqual(expect.any(String));
    expect(service.getConversation(body.conversationId)?.messages).toEqual([]);
  });
});

describe('POST /api/conversations/:id/messages', () => {
  it('accepts one question and appends one assistant response', async () => {
    const contexts: ChatContextMessage[][] = [];
    const llmService: LlmService = {
      async generateResponse(context) {
        contexts.push([...context]);
        return { ok: true, content: 'A clear answer.' };
      }
    };
    const { baseUrl, service } = await startTestServer(llmService);
    const conversationResponse = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const { conversationId } = await conversationResponse.json() as { conversationId: string };

    const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'What makes a good question?' })
    });
    const accepted = await response.json() as {
      responseAttemptId: string;
      userMessageId: string;
      state: string;
    };

    expect(response.status).toBe(202);
    expect(accepted.state).toBe('pending');
    expect(accepted.userMessageId).toEqual(expect.any(String));

    const completed = await pollAttempt(baseUrl, conversationId, accepted.responseAttemptId);
    expect(completed.response.status).toBe(200);
    expect(completed.body).toMatchObject({ state: 'completed', content: 'A clear answer.' });
    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toEqual([
      { role: 'user', content: 'What makes a good question?' }
    ]);
    expect(service.getConversation(conversationId)?.messages).toHaveLength(2);
  });

  it('returns a user-safe failure when the model cannot respond', async () => {
    const llmService: LlmService = {
      async generateResponse() {
        return {
          ok: false,
          failure: {
            code: 'provider' as const,
            message: 'The assistant could not respond right now. Please try again.'
          }
        };
      }
    };
    const { baseUrl } = await startTestServer(llmService);
    const conversationResponse = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const { conversationId } = await conversationResponse.json() as { conversationId: string };

    const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Please answer safely.' })
    });
    const accepted = await response.json() as { responseAttemptId: string };
    const failed = await pollAttempt(baseUrl, conversationId, accepted.responseAttemptId);

    expect(failed.body).toMatchObject({
      state: 'failed',
      error: 'The assistant could not respond right now. Please try again.'
    });
    expect(JSON.stringify(failed.body)).not.toContain('test-only-key');
  });
});

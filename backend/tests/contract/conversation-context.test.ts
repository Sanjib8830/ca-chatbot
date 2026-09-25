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

async function waitForCompletion(
  service: ConversationService,
  conversationId: string,
  attemptId: string
): Promise<void> {
  for (let count = 0; count < 40; count += 1) {
    const result = service.getAttempt(conversationId, attemptId);
    if (result.kind === 'found' && result.attempt.state !== 'pending') {
      return;
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

describe('conversation context', () => {
  it('keeps follow-up context ordered and isolates a new conversation', async () => {
    const contexts: ChatContextMessage[][] = [];
    const llmService: LlmService = {
      async generateResponse(context) {
        contexts.push([...context]);
        return { ok: true, content: `Answer ${contexts.length}` };
      }
    };
    const { baseUrl, service } = await startServer(llmService);

    const firstConversationResponse = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const { conversationId } = await firstConversationResponse.json() as { conversationId: string };
    const firstQuestionResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'What is a good first step?' })
    });
    const firstQuestion = await firstQuestionResponse.json() as { responseAttemptId: string };
    await waitForCompletion(service, conversationId, firstQuestion.responseAttemptId);

    const followUpResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'What should I do next?' })
    });
    const followUp = await followUpResponse.json() as { responseAttemptId: string };
    await waitForCompletion(service, conversationId, followUp.responseAttemptId);

    expect(contexts[1]).toEqual([
      { role: 'user', content: 'What is a good first step?' },
      { role: 'assistant', content: 'Answer 1' },
      { role: 'user', content: 'What should I do next?' }
    ]);
    expect(service.getConversation(conversationId)?.messages.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'user', content: 'What is a good first step?' },
      { role: 'assistant', content: 'Answer 1' },
      { role: 'user', content: 'What should I do next?' },
      { role: 'assistant', content: 'Answer 2' }
    ]);

    const newConversationResponse = await fetch(`${baseUrl}/api/conversations`, { method: 'POST' });
    const { conversationId: newConversationId } = await newConversationResponse.json() as { conversationId: string };
    expect(newConversationId).not.toBe(conversationId);
    expect(service.getConversation(newConversationId)?.messages).toEqual([]);
  });
});

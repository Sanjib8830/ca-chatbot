import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ConversationService } from '../services/conversationService.js';

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 100_000) {
      throw new Error('request body too large');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function attemptPayload(
  result: Extract<ReturnType<ConversationService['getAttempt']>, { kind: 'found' }>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    responseAttemptId: result.attempt.id,
    state: result.attempt.state
  };

  if (result.attempt.state === 'completed' && result.assistantMessage) {
    payload.assistantMessageId = result.assistantMessage.id;
    payload.content = result.assistantMessage.content;
  }

  if (result.attempt.state === 'failed') {
    payload.error = result.attempt.errorSummary ?? 'The assistant could not respond right now.';
  }

  return payload;
}

function submissionPayload(
  result: Extract<ReturnType<ConversationService['submitQuestion']>, { kind: 'accepted' }>
): Record<string, unknown> {
  return {
    responseAttemptId: result.attempt.id,
    userMessageId: result.userMessage.id,
    state: result.attempt.state
  };
}

export async function handleConversationRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  service: ConversationService,
  pathname: string
): Promise<boolean> {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'api' || segments[1] !== 'conversations') {
    return false;
  }

  if (segments.length === 2 && request.method === 'POST') {
    const conversation = service.createConversation();
    sendJson(response, 201, { conversationId: conversation.id });
    return true;
  }

  if (segments.length === 4 && segments[3] === 'messages' && request.method === 'POST') {
    const conversationId = segments[2];
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: 'Send a valid JSON request body.' });
      return true;
    }

    if (!isRecord(body) || typeof body.content !== 'string') {
      sendJson(response, 400, { error: 'Request body must include a content string.' });
      return true;
    }

    const result = service.submitQuestion(conversationId, body.content);
    if (result.kind === 'not_found') {
      sendJson(response, 404, { error: 'Conversation not found.' });
    } else if (result.kind === 'validation_error') {
      sendJson(response, 400, { error: result.error });
    } else {
      sendJson(response, 202, submissionPayload(result));
    }
    return true;
  }

  if (segments.length === 6 && segments[3] === 'messages') {
    const conversationId = segments[2];
    const responseAttemptId = segments[4];

    if (segments[5] === 'retry' && request.method === 'POST') {
      const result = service.retryAttempt(conversationId, responseAttemptId);
      if (result.kind === 'not_found') {
        sendJson(response, 404, { error: 'Response attempt not found.' });
      } else if (result.kind === 'invalid_state') {
        sendJson(response, 409, { error: result.error });
      } else {
        sendJson(response, 202, submissionPayload(result));
      }
      return true;
    }
  }

  if (segments.length === 5 && segments[3] === 'messages' && request.method === 'GET') {
    const result = service.getAttempt(segments[2], segments[4]);
    if (result.kind === 'not_found') {
      sendJson(response, 404, { error: 'Response attempt not found.' });
    } else {
      sendJson(response, 200, attemptPayload(result));
    }
    return true;
  }

  sendJson(response, 404, { error: 'Route not found.' });
  return true;
}

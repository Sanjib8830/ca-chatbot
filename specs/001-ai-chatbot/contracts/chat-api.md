# Conversation API Contract

This backend API is the only interface the frontend uses to interact with the
LangChain / Google AI Studio integration, per constitution Principle II (Layered LLM
Integration). Request/response bodies carry only conversation data — never provider
credentials or model configuration (constitution Principle III).

## POST /api/conversations

Starts a new, empty conversation.

**Request body**: none.

**Response 201**:

```json
{
  "conversationId": "string"
}
```

Satisfies FR-007 (starting a new conversation with no prior messages).

## POST /api/conversations/{conversationId}/messages

Submits a user question to an existing conversation and requests an assistant
response.

**Path parameters**:

- `conversationId` (string, required): The active conversation.

**Request body**:

```json
{
  "content": "string"
}
```

- `content` MUST be non-empty after trimming whitespace (FR-003).
- `content` MUST NOT exceed the configured message-length limit (FR-013).

**Response 202 (accepted, processing)**:

```json
{
  "responseAttemptId": "string",
  "userMessageId": "string",
  "state": "pending"
}
```

Returned immediately so the frontend can show a pending state and disable
resubmission of the same message (FR-004).

**Response 200 (completed synchronously, if applicable)**:

```json
{
  "responseAttemptId": "string",
  "userMessageId": "string",
  "assistantMessageId": "string",
  "state": "completed",
  "content": "string"
}
```

**Response 4xx (validation error)**:

```json
{
  "error": "string"
}
```

Returned when `content` is empty/whitespace-only or exceeds the length limit
(FR-003, FR-013). The frontend keeps the user's draft so it can be corrected without
retyping.

**Response 5xx / timeout (assistant failure)**:

```json
{
  "responseAttemptId": "string",
  "userMessageId": "string",
  "state": "failed",
  "error": "string"
}
```

Satisfies FR-008/FR-009: the triggering message and its `responseAttemptId` remain
addressable so the frontend can offer a retry without requiring the user to retype
the question.

## GET /api/conversations/{conversationId}/messages/{responseAttemptId}

Polls the state of a previously submitted response attempt (used when the POST
above returns `202 pending`).

**Response 200**:

```json
{
  "responseAttemptId": "string",
  "state": "pending | completed | failed",
  "assistantMessageId": "string",
  "content": "string",
  "error": "string"
}
```

Fields not applicable to the current `state` are omitted.

## POST /api/conversations/{conversationId}/messages/{responseAttemptId}/retry

Retries a `failed` response attempt using its original triggering message content,
without requiring the client to resend the text (FR-009).

**Request body**: none.

**Response**: Same shape as `POST /api/conversations/{conversationId}/messages`.

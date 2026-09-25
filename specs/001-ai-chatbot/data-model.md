# Phase 1 Data Model: AI Chatbot Conversation

Entities are derived from the "Key Entities" section of `spec.md` and the
acceptance scenarios in User Stories 1-3.

## Conversation

Represents the active sequence of messages for a single session.

- **id**: Unique identifier for the active conversation.
- **status**: One of `active` (accepting new messages) — this MVP only supports a
  single active conversation per session, so no archival states are modeled yet.
- **messages**: Ordered list of `Message` entities, oldest first.

**Validation rules**:

- A conversation MUST always have a well-defined message order (FR-005).
- Starting a new conversation MUST produce a new `Conversation` with an empty
  `messages` list and MUST NOT copy messages from a prior conversation (FR-007).

**State transitions**:

- `active` → `active` (new messages appended); a "start new conversation" action
  creates a new `Conversation` instance rather than transitioning the existing one.

## Message

Represents a single user question or assistant response within a conversation.

- **id**: Unique identifier for the message.
- **conversationId**: The `Conversation` this message belongs to.
- **role**: One of `user` or `assistant`.
- **content**: The text content of the message.
- **createdAt**: Timestamp used to preserve display order.
- **displayStatus**: One of `sent`, `pending`, `complete`, or `failed` (see Response
  Attempt below for how this is derived for assistant messages).

**Validation rules**:

- A `user` message's `content` MUST NOT be empty or whitespace-only (FR-003).
- A `user` message's `content` MUST NOT exceed the configured message-length limit
  (FR-013); the limit itself is a configuration value, not hard-coded in this model.
- Each accepted user message MUST appear in `messages` exactly once, even if the
  underlying request is retried (FR-004, Edge Cases).

## Response Attempt

Represents the processing lifecycle for a single submitted user message, used to
drive pending/error UI state and retries.

- **id**: Unique identifier for the attempt.
- **triggeringMessageId**: The `Message` (role `user`) that started this attempt.
- **state**: One of `pending`, `completed`, or `failed`.
- **resultingMessageId**: The `Message` (role `assistant`) produced on success; unset
  while `pending` or `failed`.
- **errorSummary**: A user-presentable error description; set only when `state` is
  `failed`.

**Validation rules**:

- While a `Response Attempt` is `pending` for a conversation, the interface MUST
  prevent the same user submission from being sent again (FR-004, User Story 1
  Acceptance Scenario 2).
- A `failed` attempt MUST retain the triggering message content so the user can
  retry without retyping it (FR-009).
- A `completed` attempt MUST reference exactly one resulting assistant message,
  appended after its triggering user message (FR-005).

**State transitions**:

- `pending` → `completed` (assistant response received and displayed).
- `pending` → `failed` (model call errors or times out; FR-008).
- `failed` → `pending` (user retries the same triggering message; FR-009).

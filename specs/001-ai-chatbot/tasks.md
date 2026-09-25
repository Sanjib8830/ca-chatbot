---

description: "Actionable task list for the AI chatbot conversation feature"
---

# Tasks: AI Chatbot Conversation

**Input**: Design documents from `specs/001-ai-chatbot/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/chat-api.md](./contracts/chat-api.md), and [quickstart.md](./quickstart.md)

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an incremental product slice.

**Testing note**: Test tasks are included because constitution Principle V requires focused automated coverage when a test harness exists, plus documented manual verification for the live model boundary.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel with other tasks in the same phase because it uses different files and has no incomplete dependency.
- **[Story]**: The user story that owns the task. Setup, foundational, and polish tasks intentionally have no story label.
- Every task includes the exact file path or paths it creates or changes.

## Path Conventions

- Backend source: `backend/src/`
- Backend tests: `backend/tests/`
- Frontend source: `frontend/src/`
- Frontend tests: `frontend/tests/`
- Feature documentation: `specs/001-ai-chatbot/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the TypeScript web application workspace and the frontend/backend development commands.

- [X] T001 Create the root workspace manifest and shared scripts in `package.json` for the `frontend` and `backend` workspaces, including install, dev, typecheck, lint, and test commands.
- [X] T002 [P] Initialize the React 18 and TypeScript frontend package in `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, and `frontend/index.html` with Vite, Vitest, and React Testing Library dependencies.
- [X] T003 [P] Initialize the Node.js 20 and TypeScript backend package in `backend/package.json` and `backend/tsconfig.json` with LangChain, `@langchain/core`, `@langchain/google-genai`, Vitest, and a TypeScript runtime command.
- [X] T004 [P] Add repository ignore rules in `.gitignore` for `node_modules/`, build output, test coverage, local environment files, and Google AI Studio credentials.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared domain, runtime configuration, model integration boundary, and typed API plumbing required by all user stories.

**Critical**: Complete this phase before starting user-story implementation.

- [X] T005 [P] Define `Conversation`, `Message`, and `ResponseAttempt` TypeScript types and state unions in `backend/src/models/chat.ts`, including ordered messages, `user`/`assistant` roles, `sent`/`pending`/`complete`/`failed` display statuses, and `pending`/`completed`/`failed` response states.
- [X] T006 [P] Implement server-only environment parsing and validation in `backend/src/config/env.ts` for `GOOGLE_API_KEY`, the `gemma-4-26b-a4b-it` model identifier, the configured message-length limit, and request timeout; fail safely without logging secret values.
- [X] T007 [P] Implement the LangChain model boundary in `backend/src/services/llmService.ts` using `@langchain/google-genai`, Google AI Studio runtime credentials, and the `gemma-4-26b-a4b-it` model; expose typed response and failure results without exposing provider configuration to callers.
- [X] T008 [P] Define frontend DTOs and API result types in `frontend/src/types/chat.ts` that mirror `contracts/chat-api.md` while excluding provider credentials and model configuration.
- [X] T009 Create the backend HTTP server and shared error/JSON handling in `backend/src/api/server.ts`, including the `/api` route registration point and a safe default error response.
- [X] T010 [P] Implement the typed frontend conversation client in `frontend/src/services/chatApi.ts` for the contract operations, including response status handling and conversion of failed requests into typed errors.
- [X] T011 [P] Add shared frontend reset, focus, and responsive layout styles in `frontend/src/styles/base.css` for the keyboard-operable and viewport-safe interaction requirements.

**Checkpoint**: Workspace packages, domain types, server-only model configuration, typed API plumbing, and shared error handling are ready for story work.

## Phase 3: User Story 1 - Ask a Question (Priority: P1) MVP

**Goal**: Let a user submit a valid text question, see it exactly once with pending feedback, and receive an assistant response.

**Independent Test**: Start an empty conversation, submit a non-empty question, and verify that the question appears once, pending work is visible, and one assistant response appears when processing completes.

### Tests for User Story 1

- [X] T012 [P] [US1] Add backend contract tests in `backend/tests/contract/ask-question.test.ts` for creating an empty conversation, accepting a non-empty question, returning the user message and response attempt, and returning an assistant response or actionable failure.
- [X] T013 [P] [US1] Add frontend interaction tests in `frontend/tests/ChatPage.ask-question.test.tsx` for rendering the composer, rejecting empty input, showing the submitted message once, disabling duplicate submission while pending, and rendering the assistant response.

### Implementation for User Story 1

- [X] T014 [US1] Implement the initial conversation and question-processing service in `backend/src/services/conversationService.ts`, enforcing that a user message content MUST NOT be empty or whitespace-only, MUST NOT exceed the configured message-length limit, and MUST be added exactly once before the response attempt begins.
- [X] T015 [US1] Implement `POST /api/conversations` and `POST /api/conversations/{conversationId}/messages` in `backend/src/api/conversations.ts`, returning the contract's `201`, `202 pending`, `200 completed`, validation-error, and assistant-failure shapes.
- [X] T016 [P] [US1] Implement role-aware message rendering in `frontend/src/components/MessageList.tsx` and `frontend/src/components/ConversationView.tsx`, distinguishing user messages, assistant responses, pending work, and errors.
- [X] T017 [P] [US1] Implement the labeled, keyboard-operable message composer in `frontend/src/components/MessageComposer.tsx`, including whitespace validation, configured length-limit feedback, visible focus states, and disabled duplicate submission while a response is pending.
- [X] T018 [US1] Implement the P1 chat page state and API integration in `frontend/src/pages/ChatPage.tsx`, creating the initial conversation, appending the accepted user message once, displaying pending/completed states, and wiring `MessageList` and `MessageComposer`.
- [X] T019 [US1] Wire the frontend entrypoint in `frontend/src/App.tsx` and `frontend/src/main.tsx` to render `ChatPage` with the shared styles from `frontend/src/styles/base.css`.
- [X] T020 [US1] Register the conversation routes from `backend/src/api/conversations.ts` in `backend/src/api/server.ts` and connect the frontend development proxy in `frontend/vite.config.ts` to the backend API.

**Checkpoint**: User Story 1 is independently functional and testable through the P1 acceptance scenarios and the first quickstart validation scenario.

## Phase 4: User Story 2 - Continue a Conversation (Priority: P2)

**Goal**: Preserve ordered conversation context for follow-up questions and allow the user to start a clean conversation.

**Independent Test**: Complete one exchange, submit a related follow-up, verify the response is appended after the earlier messages using prior context, then start a new conversation and verify it has no prior messages.

### Tests for User Story 2

- [X] T021 [P] [US2] Add backend contract tests in `backend/tests/contract/conversation-context.test.ts` for ordered prior-message context, follow-up response placement, and a new conversation with an empty message list.
- [X] T022 [P] [US2] Add frontend interaction tests in `frontend/tests/ChatPage.follow-up.test.tsx` for rendering ordered history, submitting a follow-up after completion, and clearing prior messages when starting a new conversation.

### Implementation for User Story 2

- [X] T023 [US2] Extend `backend/src/services/conversationService.ts` to serialize prior active-conversation messages in order for follow-up model calls and append exactly one completed assistant message after each triggering user message.
- [X] T024 [US2] Extend `frontend/src/services/chatApi.ts` with typed create-conversation and history operations from `contracts/chat-api.md`, preserving message roles, ordering, and response-attempt identifiers.
- [X] T025 [P] [US2] Implement the accessible new-conversation control in `frontend/src/components/NewConversationButton.tsx`, with a visible label, keyboard operation, and focus state.
- [X] T026 [US2] Extend `frontend/src/pages/ChatPage.tsx` to keep the active conversation history, submit follow-ups with the existing conversation identifier, and replace the active state with an empty conversation after the new-conversation action.

**Checkpoint**: User Stories 1 and 2 are independently testable; the user can ask an initial question, continue it, and reset to a clean conversation.

## Phase 5: User Story 3 - Recover from a Failed Request (Priority: P3)

**Goal**: Show an actionable error when response generation fails and retry the preserved question without requiring retyping.

**Independent Test**: Make the assistant service unavailable, submit a question, verify an understandable error and retry action, restore service, retry, and verify the original question is processed.

### Tests for User Story 3

- [X] T027 [P] [US3] Add backend contract tests in `backend/tests/contract/retry-failure.test.ts` for timeout/unusable-response failures, preserved triggering messages, failed response attempts, polling, and retry transitions from `failed` to `pending`.
- [X] T028 [P] [US3] Add frontend interaction tests in `frontend/tests/ChatPage.error-retry.test.tsx` for actionable failure feedback, retained question text, retry without retyping, and successful recovery.

### Implementation for User Story 3

- [X] T029 [US3] Normalize model timeouts and unusable responses in `backend/src/services/llmService.ts` into typed, user-safe failures without logging or returning credentials.
- [X] T030 [US3] Extend `backend/src/services/conversationService.ts` to persist failed response-attempt state in session memory, retain the triggering message content, and transition a retry from `failed` to `pending` without duplicating the user message.
- [X] T031 [US3] Implement `GET /api/conversations/{conversationId}/messages/{responseAttemptId}` and `POST /api/conversations/{conversationId}/messages/{responseAttemptId}/retry` in `backend/src/api/conversations.ts` using the exact contract response states and error shape.
- [X] T032 [P] [US3] Implement the user-safe failure presentation and retry control in `frontend/src/components/ErrorState.tsx`, with an understandable message, accessible action label, and visible focus state.
- [X] T033 [US3] Extend `frontend/src/services/chatApi.ts` and `frontend/src/pages/ChatPage.tsx` to poll pending attempts, render failed states, preserve the original question, and invoke retry without requiring re-entry.
- [X] T034 [US3] Register polling and retry routes in `backend/src/api/server.ts` and verify the error response path never serializes `GOOGLE_API_KEY` or model configuration.

**Checkpoint**: All three user stories are independently functional, including the recoverable failure path.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Apply constitution-wide quality gates and run the documented validation scenarios.

- [X] T035 [P] Update responsive chat layout and visible keyboard focus behavior in `frontend/src/styles/chat.css` and `frontend/src/styles/base.css` so messages and required controls do not overlap at supported viewport sizes.
- [X] T036 [P] Add runtime configuration and secret-boundary tests in `backend/tests/security/runtime-config.test.ts`, confirming missing credentials fail safely and no provider secret appears in frontend DTOs, API responses, logs, or bundles.
- [X] T037 [P] Add frontend accessibility assertions in `frontend/tests/accessibility/chat-controls.test.tsx` for semantic labels, keyboard operation, and visible focus on the composer, new-conversation, and retry controls.
- [X] T038 Run the repository typecheck, lint, and test scripts defined in `package.json`, `frontend/package.json`, and `backend/package.json`, then fix any failures in the affected source or test files.
- [X] T039 Run every manual scenario in `specs/001-ai-chatbot/quickstart.md`, including the live Google AI Studio failure/retry check, and record the verification result in the implementation review.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; initializes the workspace packages and development commands.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user-story work.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and the shared P1 conversation shell from User Story 1; extends it with ordered context and reset behavior.
- **User Story 3 (Phase 5)**: Depends on Foundational and the P1 submission flow from User Story 1; extends it with failed-attempt and retry behavior.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependency on another user story. This is the suggested MVP boundary.
- **User Story 2 (P2)**: Uses the P1 conversation shell and API client, then remains independently testable through follow-up and reset scenarios.
- **User Story 3 (P3)**: Uses the P1 submission flow and model boundary, then remains independently testable by substituting an unavailable model service.

### Within Each User Story

- Tests are written before the story implementation tasks and define the acceptance behavior.
- Domain types and service state transitions precede endpoint and UI integration.
- Backend endpoints and frontend API calls must match `contracts/chat-api.md`.
- A story checkpoint must pass before starting the next incremental story.

## Parallel Opportunities

- **Phase 1**: T002, T003, and T004 can run in parallel after T001 establishes the root workspace conventions.
- **Phase 2**: T005 through T008 and T011 can run in parallel; T009 follows the backend boundary, and T010 follows the frontend DTO types.
- **User Story 1**: T012 and T013 can run in parallel; T016 and T017 can run in parallel after the shared types exist.
- **User Story 2**: T021 and T022 can run in parallel; T025 can run independently of backend context work.
- **User Story 3**: T027 and T028 can run in parallel; T032 can run independently of backend failure-state work.
- **Phase 6**: T035, T036, and T037 can run in parallel after their respective story implementations; T038 and T039 run after all selected stories.

## Parallel Example: User Story 1

```text
Task: T012 [US1] Backend contract tests in backend/tests/contract/ask-question.test.ts
Task: T013 [US1] Frontend interaction tests in frontend/tests/ChatPage.ask-question.test.tsx

Task: T016 [US1] Message rendering in frontend/src/components/MessageList.tsx and frontend/src/components/ConversationView.tsx
Task: T017 [US1] Message composer in frontend/src/components/MessageComposer.tsx
```

## Parallel Example: User Story 2

```text
Task: T021 [US2] Conversation contract tests in backend/tests/contract/conversation-context.test.ts
Task: T022 [US2] Follow-up UI tests in frontend/tests/ChatPage.follow-up.test.tsx
Task: T025 [US2] New conversation control in frontend/src/components/NewConversationButton.tsx
```

## Parallel Example: User Story 3

```text
Task: T027 [US3] Failure and retry contract tests in backend/tests/contract/retry-failure.test.ts
Task: T028 [US3] Failure and retry UI tests in frontend/tests/ChatPage.error-retry.test.tsx
Task: T032 [US3] Error state in frontend/src/components/ErrorState.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational prerequisites.
3. Complete Phase 3 User Story 1.
4. Stop and validate the first quickstart scenario plus the P1 independent test.
5. Demo or deploy the question-and-response slice if the validation passes.

### Incremental Delivery

1. Setup plus Foundational creates the typed, secure application boundary.
2. User Story 1 delivers the MVP question-and-response flow.
3. User Story 2 adds contextual follow-ups and clean conversation reset.
4. User Story 3 adds understandable failure recovery and retry.
5. Polish validates accessibility, responsive layout, secret handling, and all quickstart scenarios.

Each story adds value without requiring persistence, authentication, uploads, or multimodal input, which remain outside this feature's scope.

### Parallel Team Strategy

1. The team completes Setup and Foundational together.
2. After the foundation, one developer can own backend story work while another owns frontend story work; test tasks for each story can run in parallel.
3. User stories should merge at their checkpoints so each increment remains demonstrable and independently testable.

## Notes

- `[P]` tasks touch different files and have no incomplete dependency.
- `[US1]`, `[US2]`, and `[US3]` map directly to the prioritized stories in `spec.md`.
- Every task has a checkbox, sequential ID, required story label where applicable, and an exact file path.
- Stop at each checkpoint to validate the current story before expanding scope.
- Do not introduce persistence, authentication, uploads, multimodal input, or client-side provider credentials in this feature.

# Quickstart: Validating the AI Chatbot Conversation Feature

This guide runs and validates the MVP conversation experience end-to-end. It links to
[data-model.md](./data-model.md) and [contracts/chat-api.md](./contracts/chat-api.md)
instead of repeating their details.

## Prerequisites

- Node.js 20 LTS installed.
- A Google AI Studio API key with access to `gemma-4-26b-a4b-it`.
- Repository dependencies installed for both `backend/` and `frontend/` (see each
  package's own setup instructions once scaffolded).

## Setup

1. Provide the Google AI Studio credential to the backend only, as an environment
   variable (for example `GOOGLE_API_KEY`) read from backend runtime configuration.
   Do not place this value in any frontend file or bundle (constitution Principle
   III).
2. Start the backend service that hosts the LangChain integration and exposes the
   [Conversation API](./contracts/chat-api.md).
3. Start the frontend development server, configured to call the backend's
   conversation API base URL.

## Run

1. Open the frontend in a browser.
2. Start a new conversation (`POST /api/conversations`).
3. Submit a question through the composer.

## Validation Scenarios

Each scenario below maps to an acceptance scenario in `spec.md`.

1. **Ask a question (User Story 1)**: Submit a non-empty question. Confirm the
   question appears immediately, a pending state is shown, and the assistant
   response appears once available. Confirm submitting again while pending does not
   duplicate the message.
2. **Continue a conversation (User Story 2)**: After a completed exchange, submit a
   related follow-up. Confirm the response reflects the earlier exchange. Then start
   a new conversation and confirm no prior messages are present.
3. **Recover from a failed request (User Story 3)**: Temporarily point the backend at
   an unreachable or invalid model configuration, submit a question, and confirm an
   understandable error with a retry action is shown. Restore the configuration,
   use the retry action, and confirm the original question is processed without
   retyping it.
4. **Validation and length limits (Edge Cases)**: Submit an empty/whitespace-only
   message and confirm it is rejected without a network call. Submit a message
   longer than the configured limit and confirm the limit is explained and the text
   remains editable.
5. **Accessibility and responsiveness (constitution Principle IV)**: Using only the
   keyboard, complete the ask-a-question flow and confirm focus states are visible.
   Resize the viewport to a supported mobile width and confirm no required content is
   hidden or overlapping.

## Automated Tests

Run the automated test suites referenced in `plan.md`'s Technical Context:

- Frontend: Vitest + React Testing Library component/interaction tests.
- Backend: Vitest unit tests for the conversation API and LangChain integration
  boundary.

Until backend-to-Google-AI-Studio integration tests are added, Validation Scenario 3
above serves as the documented manual verification step required by constitution
Principle V.

## Expected Outcome

All five validation scenarios pass, matching the measurable outcomes in `spec.md`
(SC-001 through SC-005).

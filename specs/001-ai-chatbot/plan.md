# Implementation Plan: AI Chatbot Conversation

**Branch**: `001-ai-chatbot` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-chatbot/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Deliver an MVP conversational chat experience: users submit a text question, see a
pending state, and receive an assistant response that can incorporate prior messages
in the same conversation. A typed React frontend renders the conversation and never
talks to the model provider directly; a backend service holds the LangChain
integration and calls Google AI Studio's `gemma-4-26b-a4b-it` model, keeping
credentials and provider configuration out of the client per the constitution.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (backend service) and React 18
with TypeScript (frontend), per `prd.md` and `frontend-instruction.md`.

**Primary Dependencies**: React (frontend UI); LangChain.js (`@langchain/core`) with
the `@langchain/google-genai` integration to call Google AI Studio's
`gemma-4-26b-a4b-it` model from the backend only.

**Storage**: N/A — the active conversation is held in session/application state for
this MVP; no database or persistent store is introduced (see spec Assumptions).

**Testing**: Vitest with React Testing Library for frontend component and interaction
tests; Vitest for backend unit tests; a documented manual verification step covers the
live model call until contract/integration tests are added in a later iteration.

**Target Platform**: Web browser (frontend) and a Node.js server process (backend API
that hosts the LangChain/Google AI Studio integration).

**Project Type**: Web application (frontend + backend), matching Option 2 of the
Project Structure below.

**Performance Goals**: Assistant responses or actionable errors are returned within 15
seconds under normal network conditions (spec SC-002); user input controls provide
immediate (<100ms) feedback when a message is submitted.

**Constraints**: Provider credentials and model configuration MUST stay in backend
runtime configuration only (constitution Principle III); the frontend MUST remain
keyboard-operable, accessible, and responsive across supported viewport sizes
(constitution Principle IV, spec FR-010/FR-011); only one active conversation is
supported per session for this MVP (spec Assumptions).

**Scale/Scope**: Single-user, single active conversation per session; 3 prioritized
user stories (ask a question, continue a conversation, recover from a failed
request) covering the MVP scope defined in spec.md.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I. Typed React Frontend | Frontend MUST be React + TypeScript with typed component/API boundaries | PASS | Technical Context specifies React 18 + TypeScript for the frontend; Project Structure isolates it in `frontend/`. |
| II. Layered LLM Integration | All model calls MUST go through LangChain; frontend MUST NOT configure providers/models directly | PASS | LangChain.js integration lives in `backend/`; the frontend only calls the backend's conversation API. |
| III. Secure Runtime Configuration | Secrets/provider config MUST stay server-side; frontend MUST receive only workflow data | PASS | Constraints section requires Google AI Studio credentials to live in backend runtime configuration only; contracts expose conversation data, not credentials. |
| IV. Accessible Responsive UX | UI MUST remain keyboard-operable, labeled, and usable across supported viewports | PASS | Constraints and Performance Goals carry forward spec FR-010/FR-011; quickstart validation includes an accessibility/responsive check. |
| V. Testable Delivery | Changes MUST have automated tests or a documented manual verification step, plus passing type-check/lint/test gates | PASS | Testing section defines Vitest + React Testing Library; the live Google AI Studio call is explicitly covered by a documented manual verification step until integration tests are added. |

No violations identified; the Complexity Tracking table below is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-chatbot/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/       # Conversation, Message, ResponseAttempt types
│   ├── services/     # LangChain + Google AI Studio integration
│   └── api/          # Conversation API endpoints (see contracts/)
└── tests/

frontend/
├── src/
│   ├── components/   # Conversation view, message list, composer, error/retry UI
│   ├── pages/        # Chat page
│   └── services/     # Typed client for the backend conversation API
└── tests/
```

**Structure Decision**: Option 2 (web application) is used because the constitution
requires the LangChain/provider integration to be isolated from the React frontend.
`backend/` owns the LangChain integration, Google AI Studio credentials, and the
conversation API; `frontend/` owns the typed React UI and only calls that API.

## Complexity Tracking

No Constitution Check violations were identified for this feature, so this section
intentionally contains no entries.

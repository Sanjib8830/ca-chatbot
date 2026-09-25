# Phase 0 Research: AI Chatbot Conversation

All Technical Context values were resolved directly from `prd.md`,
`frontend-instruction.md`, and `.specify/memory/constitution.md`; no
`NEEDS CLARIFICATION` markers remain. This document records the resulting
decisions and the alternatives considered for each.

## Frontend framework and language

- **Decision**: React 18 with TypeScript for all frontend components, pages, and the
  API client.
- **Rationale**: `prd.md` and `frontend-instruction.md` require React with TypeScript,
  and constitution Principle I mandates typed components and API boundaries.
- **Alternatives considered**: None — this is a fixed project requirement, not an
  open technology choice.

## LLM integration framework

- **Decision**: LangChain.js (`@langchain/core`) running only in the backend service.
- **Rationale**: `prd.md` specifies LangChain as the LLM framework, and constitution
  Principle II requires all model calls to pass through LangChain while keeping
  presentational components free of provider/model configuration.
- **Alternatives considered**: Calling the Google AI Studio SDK directly without
  LangChain — rejected because it conflicts with the constitution's Layered LLM
  Integration principle.

## Provider and model client

- **Decision**: `@langchain/google-genai`, configured for Google AI Studio and
  targeting the `gemma-4-26b-a4b-it` model.
- **Rationale**: `prd.md` fixes both the provider ("Google via AI Studio") and the
  model (`gemma-4-26b-a4b-it`); this LangChain integration package is the supported
  way to reach that provider from LangChain.js.
- **Alternatives considered**: A custom HTTP client for the Google AI Studio API —
  rejected because it would duplicate functionality LangChain already provides and
  would weaken the Layered LLM Integration guarantee.

## Backend runtime

- **Decision**: A Node.js/TypeScript backend service that hosts the LangChain
  integration and exposes a small conversation API to the frontend.
- **Rationale**: Constitution Principle III requires provider credentials and model
  configuration to live in server-side runtime configuration, never in frontend code
  or bundles. A dedicated backend keeps the same language (TypeScript) as the
  frontend while isolating secrets and provider setup.
- **Alternatives considered**: Running LangChain from a serverless function per
  request — a viable future evolution, but out of scope for this MVP plan since the
  spec does not require it; documented here as a non-blocking alternative.

## Testing tooling

- **Decision**: Vitest for both frontend and backend unit/component tests, with
  React Testing Library for frontend component behavior.
- **Rationale**: Constitution Principle V requires automated tests when a harness
  exists, or a documented manual verification step. Vitest is a standard,
  TypeScript-first test runner compatible with both the React frontend and the
  Node.js backend, minimizing tooling divergence.
- **Alternatives considered**: Jest — a reasonable alternative, but Vitest was chosen
  for faster TypeScript-native execution and shared configuration across
  frontend/backend without additional transpilation setup.

## Conversation state persistence

- **Decision**: Hold the active conversation in in-memory/session application state
  only; no database or persistent store is introduced in this feature.
- **Rationale**: The spec's Assumptions explicitly scope conversation history to the
  active session and mark persistence as a future concern, not a requirement of this
  feature.
- **Alternatives considered**: Persisting conversations in a database — deferred as
  out of scope; would require additional data-retention and security decisions not
  yet specified.

## Error handling and retry pattern

- **Decision**: The backend returns a structured error for failed model calls; the
  frontend keeps the user's submitted question or draft and offers an explicit retry
  action that resubmits without requiring retyping.
- **Rationale**: Directly satisfies spec FR-008/FR-009 and the User Story 3
  acceptance scenarios for recoverable failures.
- **Alternatives considered**: Automatic silent retries with no user feedback —
  rejected because it does not satisfy FR-008's requirement for an understandable
  error and explicit retry action.

**Output**: All Technical Context entries are resolved; no open
`NEEDS CLARIFICATION` items remain for Phase 1.

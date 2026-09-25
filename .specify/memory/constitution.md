<!--
Sync Impact Report
- Version change: unversioned scaffold -> 1.0.0
- Modified principles: five template placeholders replaced with Typed React Frontend,
  Layered LLM Integration, Secure Runtime Configuration, Accessible Responsive UX,
  and Testable Delivery.
- Added sections: Additional Constraints, Development Workflow, and governance rules.
- Removed sections: None.
- Follow-up TODOs: The original ratification date is not recorded; replace
  TODO(RATIFICATION_DATE) before committing the amended constitution.
-->

# ca-chatbot Constitution

## Core Principles

### I. Typed React Frontend

All production frontend code MUST use React with TypeScript. Components, props, state,
and API boundaries MUST have explicit or safely inferred types. Type escape hatches MUST
be isolated and justified in code review. This keeps UI contracts visible and reduces
runtime integration errors.

### II. Layered LLM Integration

All model calls MUST pass through LangChain integration code. Presentational components
MUST NOT configure providers or models directly. The server integration MUST use Google
via AI Studio and target `gemma-4-26b-a4b-it`. This separation keeps UI code testable and
allows model infrastructure to change without rewriting the interface.

### III. Secure Runtime Configuration

Credentials and provider secrets MUST never be hardcoded in source, tests, or frontend
bundles. Provider and model configuration MUST be supplied through server-side runtime
configuration, and client code MUST receive only the data required for the user workflow.
This prevents accidental exposure of credentials.

### IV. Accessible Responsive UX

Frontend behavior MUST preserve semantic HTML, keyboard operability, visible focus states,
and meaningful labels for interactive controls. Layouts MUST remain usable across supported
viewport sizes without overlapping or hiding required content. These requirements make the
chatbot usable across devices and input methods.

### V. Testable Delivery

New frontend behavior MUST have focused automated tests when a test harness exists.
Changes to LangChain, provider, model, or API boundaries MUST include integration coverage
or a documented manual verification step. Every change MUST pass the repository's
configured type-check, lint, and test gates before merge. This keeps the user-facing
workflow and model boundary verifiable as the project grows.

## Additional Constraints

- The required frontend stack is React with TypeScript.
- The required LLM framework is LangChain.
- The server provider is Google via AI Studio.
- The target model is `gemma-4-26b-a4b-it`.
- The guidance in `.github/instruction/frontend-instruction.md` MUST be followed for
  frontend files covered by its `applyTo` pattern.
- API keys, personal access tokens, and other secrets MUST be provided through secure
  runtime configuration and MUST NOT be committed.

## Development Workflow

1. Before implementation, identify the affected UI components and any LLM or API boundary
	they depend on.
2. Keep provider and model setup in integration or server modules; keep presentational
	components focused on rendering and user interaction.
3. For each change, run the available type-check, lint, and test commands. When a command
	is not configured, record the equivalent manual verification in the change review.
4. Review accessibility, responsive behavior, error states, and secret handling for every
	user-facing frontend change.
5. Reviewers MUST reject changes that violate a Core Principle unless the constitution is
	amended first.

## Governance

This constitution defines the non-negotiable engineering rules for `ca-chatbot`. It
supersedes conflicting local practices. Amendments MUST be proposed in a documented change,
explain the affected principles and migration impact, and receive review before they are
applied. Any implementation that depends on an amended rule MUST follow the amended rule
after the amendment is accepted.

The constitution follows Semantic Versioning:
- MAJOR increments for backward-incompatible principle removals or redefinitions.
- MINOR increments for new principles or materially expanded governance.
- PATCH increments for clarifications, wording changes, and other non-semantic refinements.

Every pull request or equivalent review MUST check compliance with the Core Principles and
record any approved exception with its scope, rationale, owner, and expiration or removal
condition. Compliance review MUST occur before merge and whenever a provider, model,
frontend framework, secret-handling path, or API boundary changes.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not recorded | **Last Amended**: 2026-09-25

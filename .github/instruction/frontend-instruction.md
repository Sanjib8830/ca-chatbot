---
description: "Frontend guidance for the React and TypeScript application defined in prd.md."
applyTo: "**/*.{ts,tsx,css,scss}"
---

# Frontend Instructions

Use [prd.md](../../prd.md) as the source of truth for the project technology requirements.

- Build frontend components with React and TypeScript.
- Keep components, props, state, and API boundaries strictly typed.
- Route LLM functionality through LangChain.
- Use Google via AI Studio as the server provider.
- Target the `gemma-4-26b-a4b-it` model.
- Keep provider and model configuration outside presentational components, and never hardcode credentials.
- Preserve accessible, responsive, and maintainable UI behavior as the frontend evolves.

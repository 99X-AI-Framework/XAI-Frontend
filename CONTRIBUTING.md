# Contributing

## Workflow

Create `feat/<module>/<feature-name>` or `fix/<module>/<issue-name>` branches from `develop`. Do not commit directly to `main` or `develop`. Open focused pull requests into `develop`, explain the change, and include tests or rationale when tests are not applicable.

## Commits

Use Conventional Commits, for example `feat(risk-assessment): add risk assessment components`, `fix(explainability): correct explanation rendering`, `docs: update API integration guidelines`, `refactor(human-oversight): improve component structure`, and `test(integrations): add integration tests`.

## Standards

Use strict TypeScript, functional components, hooks, modular components, feature-based organization, and environment variables for configuration. Avoid `any`, duplication, hardcoded URLs, secrets, API keys, and `.env` files. Components are PascalCase; hooks and utilities are camelCase; constants are UPPER_SNAKE_CASE.

## Ownership

Member 1 owns Risk Assessment; Member 2 Explainability; Member 3 Human Oversight; Member 4 Integrations; Member 5 Policy and Audit. Dashboard, routing, shared components, providers, global styles, and the API client are shared infrastructure coordinated centrally.

## Checks

Before review, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm format:check`.

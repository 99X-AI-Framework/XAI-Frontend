# AI Governance Middleware Frontend

Frontend foundation for reusable human-in-the-loop and explainability capabilities for AI agents.

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Axios, React Hook Form, Zod, Lucide React, Vitest, and React Testing Library.

## Prerequisites and setup

Install Node.js and pnpm. Then run:

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Set `VITE_API_BASE_URL` in `.env.local` when backend integration begins. Do not commit local environment files.

## Commands

`pnpm dev` starts Vite. `pnpm build` creates a production build. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` validate the project. `pnpm format` formats source files.

See `CONTRIBUTING.md` and `docs/` for architecture, ownership, standards, and workflow.

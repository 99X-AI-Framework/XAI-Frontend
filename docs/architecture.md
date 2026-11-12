# Frontend Architecture

The frontend is a Vite-powered React application organized by feature. `src/app` owns application bootstrap, routing, providers, and shared navigation. Feature modules own their UI, hooks, schemas, types, and future API adapters. `src/components` contains reusable UI; `src/lib` contains cross-cutting utilities and the single Axios client.

The frontend is intentionally separated from the Python/FastAPI backend. Backend communication will be introduced through typed feature adapters using the centralized client and environment configuration.

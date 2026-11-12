# API Integration Guidelines

Use the shared Axios instance in `src/lib/api/client.ts`; never create feature-local Axios instances. Configure `VITE_API_BASE_URL` through environment files and never commit secrets. Add request and response types at the feature boundary, validate external data with Zod where appropriate, and normalize errors into user-safe messages. Actual endpoint integrations are intentionally deferred.

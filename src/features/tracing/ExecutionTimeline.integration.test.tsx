import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { apiClient } from '@/lib/api/client'
import { ExecutionTimelinePage } from './ExecutionTimelinePage'

const port = 8766
const baseURL = `http://127.0.0.1:${port}`
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../XAI-Backend')
let server: ChildProcess | undefined

async function waitForHealth() {
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/health`)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error('tracing API did not start')
}

beforeAll(async () => {
  const database = path.join(mkdtempSync(path.join(tmpdir(), 'xai-ui-trace-')), 'trace.db')
  server = spawn(path.join(backend, '.venv/bin/python'), ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: backend,
    env: {
      ...process.env,
      DATABASE_URL: `sqlite:///${database}`,
      JWT_SECRET: 'ui-integration-secret-32-characters',
      GOVERNANCE_RECEIPT_SECRET: 'ui-integration-receipt-secret-32-chars',
      FRONTEND_URL: 'http://localhost:3000',
    },
    stdio: 'ignore',
  })
  apiClient.defaults.baseURL = baseURL
  await waitForHealth()
}, 15000)

afterAll(async () => {
  server?.kill()
  apiClient.defaults.baseURL = 'http://localhost:8000'
  delete apiClient.defaults.headers.common.Authorization
})

test('shows a backend timeline in sequence order', async () => {
  const signup = await apiClient.post('/api/v1/auth/signup', {
    name: 'Timeline Tester', email: 'timeline@example.com', password: 'TracePass123',
  })
  const userToken = signup.data.access_token as string
  apiClient.defaults.headers.common.Authorization = `Bearer ${userToken}`
  const project = await apiClient.post('/api/v1/projects', {
    name: 'Timeline Lab', description: 'ui integration', type: 'Agent system', risk: 'Low', accent: '#198f70',
  })
  const projectId = project.data.id as string
  const key = await apiClient.post(`/api/v1/projects/${projectId}/api-keys`, { name: 'ui' })
  const apiKey = key.data.api_key as string
  apiClient.defaults.headers.common.Authorization = `Bearer ${apiKey}`
  const agent = await apiClient.post('/api/v1/agents', {
    project_id: projectId, name: 'UI agent', description: 'traced from the dashboard test', metadata: {},
  })
  const opened = await apiClient.post('/api/v1/tracing/executions', {
    project_id: projectId, agent_id: agent.data.agent_id,
  })
  const executionId = opened.data.execution_id as string
  await apiClient.post(`/api/v1/tracing/executions/${executionId}/events`, {
    client_event_id: 'ui-proposed', project_id: projectId, agent_id: agent.data.agent_id,
    request_id: 'req-ui', event_type: 'ACTION_PROPOSED', tool_name: 'refund',
    payload: { customer_id: 7, token: 'sekret' },
  })
  await apiClient.post(`/api/v1/tracing/executions/${executionId}/events`, {
    client_event_id: 'ui-executed', project_id: projectId, agent_id: agent.data.agent_id,
    request_id: 'req-ui', event_type: 'TOOL_EXECUTED', tool_name: 'refund', duration_ms: 18,
    payload: { output: { token: 'sekret' } },
  })

  apiClient.defaults.headers.common.Authorization = `Bearer ${userToken}`
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/tracing`]}>
        <Routes>
          <Route path="/projects/:projectId/tracing" element={<ExecutionTimelinePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  const timeline = await screen.findByRole('list', { name: 'Execution timeline' }, { timeout: 4000 })
  const types = [...timeline.querySelectorAll('b')].map((node) => node.textContent)
  expect(types).toEqual(['ACTION_PROPOSED', 'TOOL_EXECUTED'])
  expect(screen.getByText('refund · 18 ms')).toBeInTheDocument()
  expect(screen.getAllByText(/\[REDACTED\]/).length).toBeGreaterThan(0)
  expect(screen.queryByText(/sekret/)).not.toBeInTheDocument()
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ExecutionTimelinePage } from './ExecutionTimelinePage'
import { tracingApi } from './api'
import type { TraceExecutionDetail, TraceExecutionSummary } from './types'

vi.mock('./api', () => ({
  tracingApi: {
    listExecutions: vi.fn(),
    getExecution: vi.fn(),
  },
}))

const runs: TraceExecutionSummary[] = [
  {
    execution_id: 'exec-1',
    project_id: 'proj-1',
    agent_id: 'agt-1',
    started_at: '2026-11-22T12:00:00Z',
    status: 'succeeded',
    event_count: 2,
  },
]

const detail: TraceExecutionDetail = {
  ...runs[0],
  events: [
    {
      id: 'evt-2',
      client_event_id: 'c2',
      execution_id: 'exec-1',
      project_id: 'proj-1',
      agent_id: 'agt-1',
      request_id: 'req-1',
      seq_no: 2,
      event_type: 'TOOL_EXECUTED',
      tool_name: 'refund',
      recorded_at: '2026-11-22T12:00:02Z',
      duration_ms: 42,
      block_reason: null,
      error_type: null,
      error_message: null,
      payload: { input: { customer_id: 7 }, output: { token: '[REDACTED]' } },
    },
    {
      id: 'evt-1',
      client_event_id: 'c1',
      execution_id: 'exec-1',
      project_id: 'proj-1',
      agent_id: 'agt-1',
      request_id: 'req-1',
      seq_no: 1,
      event_type: 'ACTION_PROPOSED',
      tool_name: 'refund',
      recorded_at: '2026-11-22T12:00:01Z',
      duration_ms: null,
      block_reason: null,
      error_type: null,
      error_message: null,
      payload: { input: { customer_id: 7 } },
    },
  ],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects/proj-1/tracing']}>
        <Routes>
          <Route path="/projects/:projectId/tracing" element={<ExecutionTimelinePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(tracingApi.listExecutions).mockReset()
  vi.mocked(tracingApi.getExecution).mockReset()
})

test('renders a run timeline in sequence order with latency and redacted payload', async () => {
  vi.mocked(tracingApi.listExecutions).mockResolvedValue(runs)
  vi.mocked(tracingApi.getExecution).mockResolvedValue(detail)
  renderPage()

  const timeline = await screen.findByRole('list', { name: 'Execution timeline' })
  const types = [...timeline.querySelectorAll('b')].map((node) => node.textContent)
  expect(types).toEqual(['ACTION_PROPOSED', 'TOOL_EXECUTED'])
  expect(screen.getByText('2026-11-22T12:00:01Z')).toBeInTheDocument()
  expect(screen.getByText('refund · 42 ms')).toBeInTheDocument()
  expect(screen.getByText(/\[REDACTED\]/)).toBeInTheDocument()
  expect(tracingApi.getExecution).toHaveBeenCalledWith('exec-1')
})

test('shows an empty state when the project has no traced runs', async () => {
  vi.mocked(tracingApi.listExecutions).mockResolvedValue([])
  renderPage()
  expect(await screen.findByText('No traced runs yet.')).toBeInTheDocument()
  expect(tracingApi.getExecution).not.toHaveBeenCalled()
})

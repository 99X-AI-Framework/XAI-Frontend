import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Page } from '@/components/layout/Page'
import { Badge, Card } from '@/components/shared/Primitives'
import { tracingApi } from './api'
import type { TraceEvent, TraceStatus } from './types'

const statusTone: Record<TraceStatus, 'green' | 'red' | 'amber' | 'neutral'> = {
  succeeded: 'green',
  failed: 'red',
  blocked: 'amber',
  running: 'neutral',
}

function orderedEvents(events: TraceEvent[]) {
  return [...events].sort((left, right) => left.seq_no - right.seq_no)
}

export function ExecutionTimelinePage() {
  const { projectId = '' } = useParams()
  const [agentId, setAgentId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const runs = useQuery({
    queryKey: ['trace-executions', projectId, agentId],
    queryFn: () => tracingApi.listExecutions(projectId, agentId || undefined),
    enabled: Boolean(projectId),
  })
  const selected = selectedId ?? runs.data?.[0]?.execution_id ?? null
  const timeline = useQuery({
    queryKey: ['trace-execution', selected],
    queryFn: () => tracingApi.getExecution(selected as string),
    enabled: Boolean(selected),
  })
  const agents = [...new Set((runs.data ?? []).map((run) => run.agent_id))]
  const events = orderedEvents(timeline.data?.events ?? [])

  return (
    <Page
      title="Execution timeline"
      description="Tool milestones for a governed run, in server sequence order."
    >
      <Card className="table-panel">
        <div className="toolbar">
          <label className="filter-search">
            Agent
            <select aria-label="Agent" value={agentId} onChange={(event) => { setAgentId(event.target.value); setSelectedId(null) }}>
              <option value="">All agents</option>
              {agents.map((agent) => <option key={agent}>{agent}</option>)}
            </select>
          </label>
        </div>
        {runs.isLoading && <p>Loading traced runs.</p>}
        {runs.isError && <p role="alert">The execution list could not be loaded.</p>}
        {runs.data?.length === 0 && <p>No traced runs yet.</p>}
        {runs.data && runs.data.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>RUN</th>
                  <th>AGENT</th>
                  <th>STARTED</th>
                  <th>STATUS</th>
                  <th>EVENTS</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((run) => (
                  <tr key={run.execution_id}>
                    <td>
                      <button className="text-link" onClick={() => setSelectedId(run.execution_id)}>
                        {run.execution_id}
                      </button>
                    </td>
                    <td>{run.agent_id}</td>
                    <td>{run.started_at}</td>
                    <td><Badge tone={statusTone[run.status]}>{run.status}</Badge></td>
                    <td>{run.event_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected && (
        <Card>
          {timeline.isLoading && <p>Loading timeline.</p>}
          {timeline.isError && <p role="alert">The timeline could not be loaded.</p>}
          {timeline.data && (
            <>
              <div className="detail-grid">
                <div>
                  <small>RUN</small>
                  <b>{timeline.data.execution_id}</b>
                </div>
                <div>
                  <small>AGENT</small>
                  <b>{timeline.data.agent_id}</b>
                </div>
                <div>
                  <small>STATUS</small>
                  <Badge tone={statusTone[timeline.data.status]}>{timeline.data.status}</Badge>
                </div>
              </div>
              <div className="trace-list" role="list" aria-label="Execution timeline">
                {events.map((event) => (
                  <div className="trace-item" key={event.id}>
                    <span className="trace-icon">{event.seq_no}</span>
                    <div>
                      <small>{event.recorded_at}</small>
                      <b>{event.event_type}</b>
                      <p>
                        {event.tool_name}
                        {event.duration_ms !== null ? ` · ${event.duration_ms} ms` : ''}
                      </p>
                      {event.block_reason && <p>{event.block_reason}</p>}
                      {event.error_message && <p>{event.error_type}: {event.error_message}</p>}
                      <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </Page>
  )
}

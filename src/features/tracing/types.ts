export type TraceStatus = 'running' | 'blocked' | 'failed' | 'succeeded'

export type TraceEvent = {
  id: string
  client_event_id: string
  execution_id: string
  project_id: string
  agent_id: string
  request_id: string | null
  seq_no: number
  event_type: 'ACTION_PROPOSED' | 'ACTION_BLOCKED' | 'TOOL_EXECUTED' | 'TOOL_FAILED'
  tool_name: string
  recorded_at: string
  duration_ms: number | null
  block_reason: string | null
  error_type: string | null
  error_message: string | null
  payload: Record<string, unknown>
}

export type TraceExecutionSummary = {
  execution_id: string
  project_id: string
  agent_id: string
  started_at: string
  status: TraceStatus
  event_count: number
}

export type TraceExecutionDetail = TraceExecutionSummary & {
  events: TraceEvent[]
}

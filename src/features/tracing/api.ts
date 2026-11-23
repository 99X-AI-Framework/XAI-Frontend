import { apiClient } from '@/lib/api/client'
import type { TraceExecutionDetail, TraceExecutionSummary } from './types'

export const tracingApi = {
  async listExecutions(projectId: string, agentId?: string): Promise<TraceExecutionSummary[]> {
    const response = await apiClient.get<TraceExecutionSummary[]>(
      `/api/v1/tracing/projects/${projectId}/executions`,
      { params: agentId ? { agent_id: agentId } : {} },
    )
    return response.data
  },
  async getExecution(executionId: string): Promise<TraceExecutionDetail> {
    const response = await apiClient.get<TraceExecutionDetail>(`/api/v1/tracing/executions/${executionId}`)
    return response.data
  },
}

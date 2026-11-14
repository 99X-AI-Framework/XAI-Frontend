import type { TeamMember } from './data'
import type { Agent, Approval, Execution } from './data'
import { apiClient } from '@/lib/api/client'

export function getProjectRecords(projectId: string): {
  agents: Agent[]
  approvals: Approval[]
  executions: Execution[]
  activity: Array<{ agent: string; event: string; risk: 'Low' | 'Medium' | 'High' | 'Critical'; time: string; status: string }>
} {
  return { agents: [], approvals: [], executions: [], activity: [] }
}
export const demoService = {
  async getProjects(): Promise<import('./data').Project[]> {
    const rows = (await apiClient.get('/api/v1/projects')).data as Array<Record<string, unknown>>
    return rows.map((row) => ({
      id: String(row.id), name: String(row.name), description: String(row.description ?? ''), type: String(row.type ?? 'Agent system'),
      agentCount: Number(row.agent_count ?? 0), executions: Number(row.executions ?? 0), pendingApprovals: Number(row.pending_approvals ?? 0),
      risk: (['Low', 'Medium', 'High', 'Critical'].includes(String(row.risk)) ? row.risk : 'Medium') as import('./data').Project['risk'],
      lastActivity: String(row.last_activity ?? 'Never'), accent: String(row.accent ?? '#198f70'),
    }))
  },
  async createProject(input: { name: string; description: string; type: string; risk: string; accent: string }) {
    return (await apiClient.post('/api/v1/projects', input)).data
  },
  async getTeamMembers(): Promise<TeamMember[]> {
    return (await apiClient.get<TeamMember[]>('/api/v1/team-members')).data
  },
  async addTeamMember(input: Pick<TeamMember, 'name' | 'email' | 'projectIds'>) {
    return (await apiClient.post('/api/v1/team-members', input)).data
  },
  async updateMembership(memberId: string, projectId: string, hasAccess: boolean) {
    return (await apiClient.patch(`/api/v1/team-members/${memberId}/projects/${projectId}`, { hasAccess })).data
  },
  async getOverview(projectId = 'atlas-research') {
    const response = (await apiClient.get(`/api/v1/projects/${projectId}/overview`)).data
    return { agents: response.agents ?? [], approvals: response.approvals ?? [], executions: [], activity: [] } as ReturnType<typeof getProjectRecords>
  },
  async decideApproval(id: string, decision: 'Approved' | 'Rejected', comment: string) {
    return (await apiClient.post(`/api/v1/approvals/${id}/decision`, { decision, comment })).data
  },
  async getApprovals(): Promise<Approval[]> {
    const rows = (await apiClient.get('/api/v1/approvals')).data as Array<Record<string, unknown>>
    return rows.map((row) => ({
      id: String(row.id), agent: String(row.agent), action: String(row.action), tool: String(row.tool),
      parameters: String(row.parameters), risk: (row.risk === 'Critical' || row.risk === 'High' || row.risk === 'Low' ? row.risk : 'Medium') as Approval['risk'],
      status: (row.status === 'Approved' || row.status === 'Rejected' || row.status === 'Expired' ? row.status : 'Pending') as Approval['status'],
      request: String(row.request ?? ''), reason: String(row.reason ?? ''), explanation: String(row.explanation ?? ''),
      reviewer: String(row.reviewer ?? 'Unassigned'), time: String(row.time ?? ''), execution: (row.execution ?? 'Interrupted') as Approval['execution'],
    }))
  },
  async addAgent(input: {
    name: string
    description: string
    framework: string
    endpoint: string
  }) {
    return {
      ...input,
      id: `agt-${Date.now()}`,
      status: 'Idle' as const,
      risk: 'Medium' as const,
      executions: 0,
      lastRun: 'Never',
    }
  },
  async deleteAgent(agentId: string) {
    await apiClient.delete(`/api/v1/agents/${agentId}`)
  },
  async getAgents(): Promise<Agent[]> {
    const rows = (await apiClient.get('/api/v1/agents')).data as Array<Record<string, unknown>>
    return rows.map((row) => ({ id: String(row.id), name: String(row.name), description: String(row.description ?? ''), framework: String(row.framework ?? ''), status: (row.status === 'Active' || row.status === 'Offline' ? row.status : 'Idle') as Agent['status'], risk: (['Low', 'Medium', 'High', 'Critical'].includes(String(row.risk)) ? row.risk : 'Medium') as Agent['risk'], executions: Number(row.executions ?? 0), lastRun: String(row.last_run ?? 'Never') }))
  },
  async createProjectApiKey(projectId: string, name: string) {
    return (await apiClient.post(`/api/v1/projects/${projectId}/api-keys`, { name })).data as { api_key: string; id: string; name: string }
  },
  async registerAgent(projectId: string, input: { name: string; description: string; framework: string; endpoint: string }) {
    return (await apiClient.post('/api/v1/agents', { ...input, project_id: projectId, metadata: {} })).data
  },
}

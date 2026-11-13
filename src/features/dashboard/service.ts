import { activity, agents, approvals, executions, teamMembers } from './data'
import type { TeamMember } from './data'
import type { Agent, Approval, Execution } from './data'

const projectAgents: Record<string, string[]> = {
  'atlas-research': ['Atlas Research', 'Nexus Knowledge'],
  'ledger-ops': ['Ledger Ops'],
  'prism-support': ['Prism Support'],
}
const scoped = <T extends { agent: string }>(projectId: string, rows: T[]) =>
  rows.filter((row) => (projectAgents[projectId] ?? []).includes(row.agent))
export function getProjectRecords(projectId: string): {
  agents: Agent[]
  approvals: Approval[]
  executions: Execution[]
  activity: typeof activity
} {
  const allowed = projectAgents[projectId] ?? []
  return {
    agents: agents.filter((agent) => allowed.includes(agent.name)),
    approvals: scoped(projectId, approvals),
    executions: scoped(projectId, executions),
    activity: activity.filter((row) => allowed.includes(row.agent)),
  }
}
export const demoService = {
  async getTeamMembers() {
    return teamMembers
  },
  async addTeamMember(input: Pick<TeamMember, 'name' | 'email' | 'projectIds'>) {
    const member: TeamMember = {
      ...input,
      id: `usr-${Date.now()}`,
      initials: input.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      role: 'Team Member',
      status: 'Invited',
      joinedDate: 'Pending invitation',
    }
    teamMembers.push(member)
    return member
  },
  async updateMembership(memberId: string, projectId: string, hasAccess: boolean) {
    const member = teamMembers.find((item) => item.id === memberId)
    if (!member) throw new Error('Team member not found')
    member.projectIds = hasAccess
      ? [...new Set([...member.projectIds, projectId])]
      : member.projectIds.filter((id) => id !== projectId)
    return member
  },
  async getOverview(projectId = 'atlas-research') {
    return getProjectRecords(projectId)
  },
  async decideApproval(id: string, decision: 'Approved' | 'Rejected', comment: string) {
    const row = approvals.find((item) => item.id === id)
    if (!row) throw new Error('Approval not found')
    if (row.status !== 'Pending') throw new Error('Only pending requests can be reviewed')
    row.status = decision
    row.reviewer = 'Jordan Davis'
    row.reason = comment ? `${row.reason} Reviewer comment: ${comment}` : row.reason
    row.execution = 'Interrupted'
    return row
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
}

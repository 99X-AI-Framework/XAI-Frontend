export type Risk = 'Low' | 'Medium' | 'High' | 'Critical'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Escalated' | 'Expired'
export type ExecutionStatus = 'Succeeded' | 'Running' | 'Failed' | 'Interrupted'
export type Agent = {
  id: string
  name: string
  description: string
  framework: string
  status: 'Active' | 'Idle' | 'Offline'
  risk: Risk
  executions: number
  lastRun: string
}
export type Approval = {
  id: string
  agent: string
  action: string
  tool: string
  parameters: string
  risk: Risk
  status: ApprovalStatus
  request: string
  reason: string
  explanation: string
  reviewer: string
  time: string
  execution: ExecutionStatus
}
export type Execution = {
  id: string
  agent: string
  request: string
  started: string
  duration: string
  status: ExecutionStatus
  risk: Risk
  tools: number
  intervention: string
}
export type Project = {
  id: string
  name: string
  description: string
  type: string
  agentCount: number
  executions: number
  pendingApprovals: number
  risk: Risk
  lastActivity: string
  accent: string
}
export type TeamMember = {
  id: string
  name: string
  email: string
  initials: string
  role: 'Team Leader' | 'Team Member'
  status: 'Active' | 'Invited'
  joinedDate: string
  projectIds: string[]
}
export type TeamMembership = { memberId: string; projectId: string; hasAccess: boolean }
export const teamMembers: TeamMember[] = [
  {
    id: 'usr-jordan',
    name: 'Jordan Davis',
    email: 'jordan@example.com',
    initials: 'JD',
    role: 'Team Leader',
    status: 'Active',
    joinedDate: 'Jan 12, 2026',
    projectIds: ['atlas-research', 'ledger-ops', 'prism-support'],
  },
  {
    id: 'usr-morgan',
    name: 'Morgan Lee',
    email: 'morgan@example.com',
    initials: 'ML',
    role: 'Team Member',
    status: 'Active',
    joinedDate: 'Feb 03, 2026',
    projectIds: ['atlas-research', 'prism-support'],
  },
  {
    id: 'usr-riley',
    name: 'Riley Chen',
    email: 'riley@example.com',
    initials: 'RC',
    role: 'Team Member',
    status: 'Active',
    joinedDate: 'Feb 18, 2026',
    projectIds: ['ledger-ops'],
  },
  {
    id: 'usr-sam',
    name: 'Sam Wilson',
    email: 'sam@example.com',
    initials: 'SW',
    role: 'Team Member',
    status: 'Active',
    joinedDate: 'Mar 01, 2026',
    projectIds: ['atlas-research'],
  },
]
export const projects: Project[] = [
  {
    id: 'atlas-research',
    name: 'Atlas Research Network',
    description: 'A multi-agent research system for supplier intelligence and internal knowledge.',
    type: 'Multi-agent system',
    agentCount: 4,
    executions: 1284,
    pendingApprovals: 2,
    risk: 'Medium',
    lastActivity: '2 min ago',
    accent: '#198f70',
  },
  {
    id: 'ledger-ops',
    name: 'Ledger Operations',
    description:
      'Finance operations agents that reconcile records and prepare controlled payments.',
    type: 'Agent system',
    agentCount: 3,
    executions: 512,
    pendingApprovals: 1,
    risk: 'Critical',
    lastActivity: '4 min ago',
    accent: '#bd7c25',
  },
  {
    id: 'prism-support',
    name: 'Prism Support Hub',
    description: 'Customer support agents for triage, drafting, and resolution workflows.',
    type: 'Multi-agent system',
    agentCount: 5,
    executions: 946,
    pendingApprovals: 1,
    risk: 'High',
    lastActivity: '19 min ago',
    accent: '#6a73c2',
  },
]
export const agents: Agent[] = [
  {
    id: 'agt-01',
    name: 'Atlas Research',
    description: 'Research and synthesis agent for internal knowledge.',
    framework: 'LangGraph',
    status: 'Active',
    risk: 'Medium',
    executions: 1284,
    lastRun: '2 min ago',
  },
  {
    id: 'agt-02',
    name: 'Prism Support',
    description: 'Customer support triage and response drafting.',
    framework: 'OpenAI Agents',
    status: 'Active',
    risk: 'High',
    executions: 946,
    lastRun: '8 min ago',
  },
  {
    id: 'agt-03',
    name: 'Ledger Ops',
    description: 'Finance operations and reconciliation assistant.',
    framework: 'CrewAI',
    status: 'Idle',
    risk: 'Critical',
    executions: 512,
    lastRun: '34 min ago',
  },
  {
    id: 'agt-04',
    name: 'Nexus Knowledge',
    description: 'Knowledge retrieval and document assistant.',
    framework: 'LangChain',
    status: 'Active',
    risk: 'Low',
    executions: 2207,
    lastRun: '1 min ago',
  },
]
export const approvals: Approval[] = [
  {
    id: 'APR-2841',
    agent: 'Ledger Ops',
    action: 'Issue vendor payment',
    tool: 'payments.create_transfer',
    parameters: '{"vendor_id":"V-4912","amount":18450,"currency":"USD"}',
    risk: 'Critical',
    status: 'Pending',
    request: 'Pay the approved invoice from Northstar Components.',
    reason: 'High-value external transfer exceeds the $10,000 review threshold.',
    explanation:
      'Invoice total matches the purchase order. The vendor bank details were updated yesterday, so this transfer requires review.',
    reviewer: 'Jordan Davis',
    time: '4 min ago',
    execution: 'Interrupted',
  },
  {
    id: 'APR-2839',
    agent: 'Prism Support',
    action: 'Issue account credit',
    tool: 'billing.issue_credit',
    parameters: '{"account":"AC-8021","amount":750}',
    risk: 'High',
    status: 'Pending',
    request: 'Resolve the customer complaint and make it right.',
    reason: 'Credit exceeds the configured $500 approval threshold.',
    explanation:
      'The agent found two service outages in the account history and proposed a goodwill credit.',
    reviewer: 'Unassigned',
    time: '19 min ago',
    execution: 'Interrupted',
  },
  {
    id: 'APR-2836',
    agent: 'Atlas Research',
    action: 'Send external email',
    tool: 'email.send',
    parameters: '{"to":"partner@example.com","attachment":"forecast.csv"}',
    risk: 'Medium',
    status: 'Escalated',
    request: 'Share the forecast with our partner.',
    reason: 'External recipient and attached data require policy review.',
    explanation: 'The draft includes a forecast attachment. Recipient is outside the workspace.',
    reviewer: 'Morgan Lee',
    time: '1 hr ago',
    execution: 'Interrupted',
  },
  {
    id: 'APR-2831',
    agent: 'Ledger Ops',
    action: 'Update vendor record',
    tool: 'vendors.update',
    parameters: '{"vendor_id":"V-174","bank_account":"•••• 2841"}',
    risk: 'High',
    status: 'Approved',
    request: 'Update the vendor banking details from the verified form.',
    reason: 'Bank detail changes are treated as high risk.',
    explanation: 'A verified change request was attached to the vendor profile.',
    reviewer: 'Jordan Davis',
    time: 'Yesterday',
    execution: 'Succeeded',
  },
]
export const executions: Execution[] = [
  {
    id: 'EXE-90821',
    agent: 'Atlas Research',
    request: 'Compare Q3 supplier performance across regions',
    started: 'Today, 10:42 AM',
    duration: '18.4s',
    status: 'Succeeded',
    risk: 'Low',
    tools: 6,
    intervention: 'None',
  },
  {
    id: 'EXE-90819',
    agent: 'Ledger Ops',
    request: 'Pay the approved Northstar invoice',
    started: 'Today, 10:39 AM',
    duration: '12.1s',
    status: 'Interrupted',
    risk: 'Critical',
    tools: 3,
    intervention: 'Approval requested',
  },
  {
    id: 'EXE-90817',
    agent: 'Prism Support',
    request: 'Resolve ticket #58210 about a delayed shipment',
    started: 'Today, 10:31 AM',
    duration: '42.8s',
    status: 'Succeeded',
    risk: 'High',
    tools: 8,
    intervention: 'Credit approved',
  },
  {
    id: 'EXE-90812',
    agent: 'Nexus Knowledge',
    request: 'Find the latest data retention policy',
    started: 'Today, 10:18 AM',
    duration: '7.2s',
    status: 'Succeeded',
    risk: 'Low',
    tools: 2,
    intervention: 'None',
  },
  {
    id: 'EXE-90808',
    agent: 'Ledger Ops',
    request: 'Reconcile yesterday’s settlement batch',
    started: 'Today, 10:04 AM',
    duration: '—',
    status: 'Failed',
    risk: 'Medium',
    tools: 4,
    intervention: 'Retry exhausted',
  },
]
export const activity = [
  {
    agent: 'Atlas Research',
    event: 'Completed supplier analysis',
    risk: 'Low',
    time: '2 min ago',
    status: 'Completed',
  },
  {
    agent: 'Ledger Ops',
    event: 'Payment requires human approval',
    risk: 'Critical',
    time: '4 min ago',
    status: 'Awaiting review',
  },
  {
    agent: 'Prism Support',
    event: 'Credit request submitted',
    risk: 'High',
    time: '19 min ago',
    status: 'Awaiting review',
  },
  {
    agent: 'Nexus Knowledge',
    event: 'Retrieved 12 policy documents',
    risk: 'Low',
    time: '26 min ago',
    status: 'Completed',
  },
]

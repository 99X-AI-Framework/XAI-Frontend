import { useQuery } from '@tanstack/react-query'
import { Activity, Bot, Clock3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/Page'
import { AsyncState, Badge, Card, Metric, SectionTitle } from '@/components/shared/Primitives'
import { demoService } from './service'
const trend: Array<{ day: string; runs: number; approvals: number }> = []
const risks: Array<{ name: string; value: number; color: string }> = []
export function OverviewPage() {
  const { projectId = 'atlas-research' } = useParams()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['overview', projectId],
    queryFn: () => demoService.getOverview(projectId),
  })
  return (
    <div className="overview-page">
      <Page
        title="Overview"
        description="A real-time view of your agents, decisions, and governance activity."
      >
        {isPending && (
          <AsyncState
            title="Loading workspace activity"
            description="Fetching the latest agents, executions, and approval data."
          />
        )}
        {isError && (
          <AsyncState
            title="Workspace data is unavailable"
            description="We could not load this project. Check the API connection and try again."
            action={
              <button className="secondary-button" onClick={() => refetch()}>
                Try again
              </button>
            }
          />
        )}
        {!isPending && !isError && data && (
          <>
        <div className="metrics-grid">
          <Metric
            label="Project agents"
            value={data.agents.length.toString().padStart(2, '0')}
            icon={Bot}
          />
          <Metric label="Executions today" value={data.executions.length} icon={Activity} />
          <Metric
            label="Pending approvals"
            value={data.approvals.filter((x) => x.status === 'Pending').length}
            icon={Clock3}
          />
        </div>
        <div className="overview-grid">
          <Card className="chart-panel">
            <SectionTitle>Execution activity</SectionTitle>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="runs" stroke="#2563eb" fill="#dbeafe" />
                  <Area dataKey="approvals" stroke="#f59e0b" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="risk-panel">
            <SectionTitle>Risk distribution</SectionTitle>
            <div className="risk-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={risks}
                    dataKey="value"
                    innerRadius={56}
                    outerRadius={78}
                    paddingAngle={4}
                  >
                    {risks.map((r) => (
                      <Cell key={r.name} fill={r.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <b>0</b>
                <small>decisions</small>
              </div>
            </div>
            <div className="risk-legend">
              {risks.map((r) => (
                <div key={r.name}>
                  <i style={{ background: r.color }} />
                  <span>{r.name}</span>
                  <b>{r.value}%</b>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="bottom-grid">
          <Card className="table-panel">
            <SectionTitle
              meta={
                <Link className="text-link" to={`/projects/${projectId}/executions`}>
                  All activity →
                </Link>
              }
            >
              Recent activity
            </SectionTitle>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>AGENT / EVENT</th>
                    <th>RISK</th>
                    <th>TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <b>{row.agent}</b>
                        <small>{row.event}</small>
                      </td>
                      <td>
                        <Badge
                          tone={
                            row.risk === 'Critical' || row.risk === 'High'
                              ? 'red'
                              : row.risk === 'Medium'
                                ? 'amber'
                                : 'green'
                          }
                        >
                          {row.risk}
                        </Badge>
                      </td>
                      <td>{row.time}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="agents-panel">
            <SectionTitle>Agent status</SectionTitle>
            {data.agents.map((a) => (
              <div className="agent-row" key={a.id}>
                <div className="agent-symbol">{a.name[0]}</div>
                <div className="agent-brief">
                  <b>{a.name}</b>
                  <small>
                    {a.framework} · {a.executions.toLocaleString()} runs
                  </small>
                </div>
                <Badge tone={a.status === 'Active' ? 'green' : 'neutral'}>{a.status}</Badge>
              </div>
            ))}
          </Card>
        </div>
          </>
        )}
      </Page>
    </div>
  )
}

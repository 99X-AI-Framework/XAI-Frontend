import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bot, Plus, Search, X, Zap, CircleAlert, Activity } from 'lucide-react'
import { agents } from '@/features/dashboard/data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric } from '@/components/shared/Primitives'
const schema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters'),
  description: z.string().min(5, 'Add a short description'),
  framework: z.string().min(1),
  endpoint: z.string().url('Enter a valid endpoint URL'),
})
type FormData = z.infer<typeof schema>
export function AgentsPage() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [created, setCreated] = useState<FormData[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const list = [
    ...agents,
    ...created.map((a, i) => ({
      ...a,
      id: `new-${i}`,
      status: 'Idle' as const,
      risk: 'Medium' as const,
      executions: 0,
      lastRun: 'Never',
    })),
  ].filter((a) => `${a.name} ${a.framework}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <Page
      title="My agents"
      description="Connect and monitor the AI agents in your workspace."
      action={
        <button className="primary-button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Connect agent
        </button>
      }
    >
      <div className="metrics-grid">
        <Metric
          label="Total agents"
          value={agents.length + created.length}
          delta="Across 4 frameworks"
          icon={Bot}
        />
        <Metric label="Active" value="3" delta="Processing normally" icon={Activity} />
        <Metric label="Inactive" value="1" delta="Available to run" icon={Zap} />
        <Metric
          label="Needs attention"
          value="1"
          delta="Review critical risk profile"
          icon={CircleAlert}
        />
      </div>
      <Card className="table-panel">
        <div className="toolbar">
          <label className="filter-search">
            <Search size={16} />
            <input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">{list.length} agents</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>AGENT</th>
                <th>FRAMEWORK</th>
                <th>STATUS</th>
                <th>RISK PROFILE</th>
                <th>EXECUTIONS</th>
                <th>LAST RUN</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    <small>{a.description}</small>
                  </td>
                  <td>{a.framework}</td>
                  <td>
                    <Badge tone={a.status === 'Active' ? 'green' : 'neutral'}>{a.status}</Badge>
                  </td>
                  <td>
                    <Badge
                      tone={a.risk === 'Critical' ? 'red' : a.risk === 'High' ? 'amber' : 'green'}
                    >
                      {a.risk}
                    </Badge>
                  </td>
                  <td>{a.executions.toLocaleString()}</td>
                  <td>{a.lastRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <form
            className="modal"
            onSubmit={handleSubmit((values) => {
              setCreated([...created, values])
              reset()
              setOpen(false)
            })}
          >
            <header>
              <div>
                <h2>Connect an agent</h2>
                <p>Demo connection · no endpoint will be contacted</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <label>
              Agent name
              <input {...register('name')} placeholder="e.g. Atlas Research" />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
            <label>
              Description
              <input {...register('description')} placeholder="What does this agent do?" />
              {errors.description && (
                <small className="field-error">{errors.description.message}</small>
              )}
            </label>
            <label>
              Integration type
              <select {...register('framework')}>
                <option value="">Choose framework</option>
                <option>LangGraph</option>
                <option>OpenAI Agents</option>
                <option>CrewAI</option>
                <option>Custom REST</option>
              </select>
            </label>
            <label>
              Agent endpoint
              <input {...register('endpoint')} placeholder="https://agent.example.com" />
              {errors.endpoint && <small className="field-error">{errors.endpoint.message}</small>}
            </label>
            <div className="demo-note">Connection details are kept only in this page session.</div>
            <footer>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Add demo agent
              </button>
            </footer>
          </form>
        </div>
      )}
    </Page>
  )
}

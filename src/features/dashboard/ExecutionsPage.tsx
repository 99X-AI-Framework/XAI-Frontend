import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Search, ChevronRight, CircleCheck, CircleX, Clock3, Hand, X } from 'lucide-react'
import { executions } from './data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric } from '@/components/shared/Primitives'
import { useDialog } from '@/hooks/useDialog'
export function ExecutionsPage() {
  const { projectId } = useParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [risk, setRisk] = useState('All')
  const [selected, setSelected] = useState<(typeof executions)[number] | null>(null)
  const closeDialog = () => setSelected(null)
  const dialogRef = useDialog(Boolean(selected), closeDialog)
  const rows = executions.filter(
    (e) =>
      `${e.id} ${e.agent} ${e.request}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === 'All' || e.status === status) &&
      (risk === 'All' || e.risk === risk),
  )
  const tone = (r: string) =>
    r === 'Critical' || r === 'High' ? 'red' : r === 'Medium' ? 'amber' : 'green'
  return (
    <Page
      title="Execution history"
      description="Trace agent runs, tool calls, and human interventions."
    >
      <div className="metrics-grid">
        <Metric label="Total executions" value="4,956" icon={Clock3} />
        <Metric label="Succeeded" value="4,812" icon={CircleCheck} />
        <Metric label="Failed" value="41" icon={CircleX} />
        <Metric label="Human intervention" value="103" icon={Hand} />
      </div>
      <Card className="table-panel">
        <div className="toolbar">
          <label className="filter-search">
            <Search size={15} />
            <input
              placeholder="Search executions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
            <select className="select-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All statuses</option>
            <option>Succeeded</option>
            <option>Interrupted</option>
            <option>Failed</option>
          </select>
          <select className="select-filter" value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="All">All risk levels</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EXECUTION / AGENT</th>
                <th>USER REQUEST</th>
                <th>STARTED</th>
                <th>DURATION</th>
                <th>STATUS</th>
                <th>RISK</th>
                <th>TOOLS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <strong>No executions match these filters</strong>
                      <span>Clear the search or choose a different status or risk level.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((e) => (
                <tr
                  className="click-row"
                  key={e.id}
                  tabIndex={0}
                  onClick={() => setSelected(e)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(e)
                    }
                  }}
                >
                  <td>
                    <b>{e.id}</b>
                    <small>{e.agent}</small>
                  </td>
                  <td>{e.request}</td>
                  <td>{e.started}</td>
                  <td>{e.duration}</td>
                  <td>
                    <Badge
                      tone={
                        e.status === 'Succeeded' ? 'green' : e.status === 'Failed' ? 'red' : 'amber'
                      }
                    >
                      {e.status}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={tone(e.risk)}>{e.risk}</Badge>
                  </td>
                  <td>{e.tools}</td>
                  <td>
                    <ChevronRight size={16} />
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <div className="modal-backdrop">
          <section
            className="modal detail-modal"
            ref={dialogRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="execution-detail-title"
            tabIndex={-1}
          >
            <header>
              <div>
                <span className="eyebrow">EXECUTION TRACE · {selected.id}</span>
                <h2 id="execution-detail-title">{selected.agent}</h2>
                <p>{selected.request}</p>
              </div>
              <button className="icon-button" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="detail-grid">
              <div>
                <small>STATUS</small>
                <Badge>{selected.status}</Badge>
              </div>
              <div>
                <small>RISK</small>
                <Badge tone={tone(selected.risk)}>{selected.risk}</Badge>
              </div>
              <div>
                <small>HUMAN INTERVENTION</small>
                <Badge>{selected.intervention}</Badge>
              </div>
            </div>
            <div className="trace-list">
              {[
                ['10:42:01', 'Task received', 'Initial request recorded'],
                ['10:42:03', 'Agent planning', 'Selected retrieval and comparison tools'],
                ['10:42:07', 'Risk assessment', 'Action evaluated against workspace policy'],
                ['10:42:11', 'Tool call', 'supplier_records.search · 24 records returned'],
                [
                  '10:42:19',
                  selected.status === 'Interrupted' ? 'Approval requested' : 'Execution completed',
                  selected.intervention,
                ],
              ].map(([time, title, detail], i) => (
                <div className="trace-item" key={time}>
                  <span className={`trace-icon ${i === 4 ? 'trace-last' : ''}`}>
                    {i === 4 ? <Hand size={14} /> : <CircleCheck size={14} />}
                  </span>
                  <div>
                    <small>{time}</small>
                    <b>{title}</b>
                    <p>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-links">
              <Link to={`/projects/${projectId}/explainability`}>Open explanation →</Link>
              <Link to={`/projects/${projectId}/approvals`}>Related approvals →</Link>
              <Link to={`/projects/${projectId}/reports`}>Transparency report →</Link>
            </div>
          </section>
        </div>
      )}
    </Page>
  )
}

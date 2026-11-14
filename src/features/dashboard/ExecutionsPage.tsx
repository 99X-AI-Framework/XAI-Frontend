import { useState } from 'react'
import { Search, ChevronRight, CircleCheck, CircleX, Clock3, Hand, X } from 'lucide-react'
import { executions } from './data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric } from '@/components/shared/Primitives'
export function ExecutionsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<(typeof executions)[number] | null>(null)
  const rows = executions.filter((e) =>
    `${e.id} ${e.agent} ${e.request}`.toLowerCase().includes(search.toLowerCase()),
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
          <select className="select-filter">
            <option>All statuses</option>
            <option>Succeeded</option>
            <option>Interrupted</option>
            <option>Failed</option>
          </select>
          <select className="select-filter">
            <option>All risk levels</option>
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
              {rows.map((e) => (
                <tr className="click-row" key={e.id} onClick={() => setSelected(e)}>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <div className="modal-backdrop">
          <section className="modal detail-modal">
            <header>
              <div>
                <span className="eyebrow">EXECUTION TRACE · {selected.id}</span>
                <h2>{selected.agent}</h2>
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
              <a href="/dashboard/explainability">Open explanation →</a>
              <a href="/dashboard/approvals">Related approvals →</a>
              <a href="/dashboard/reports">Transparency report →</a>
            </div>
          </section>
        </div>
      )}
    </Page>
  )
}

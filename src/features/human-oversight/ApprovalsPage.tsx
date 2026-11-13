import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, ShieldAlert, Clock3, CheckCheck, MessageSquare, Search } from 'lucide-react'
import { approvals as data, type Approval, type ApprovalStatus } from '@/features/dashboard/data'
import { demoService } from '@/features/dashboard/service'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric, SectionTitle } from '@/components/shared/Primitives'
export function ApprovalsPage() {
  const [status, setStatus] = useState<ApprovalStatus | 'All'>('All')
  const [selected, setSelected] = useState<Approval | null>(null)
  const [comment, setComment] = useState('')
  const [confirm, setConfirm] = useState<'Approved' | 'Rejected' | null>(null)
  const [search, setSearch] = useState('')
  const client = useQueryClient()
  useQuery({ queryKey: ['approvals'], queryFn: async () => data })
  const mutation = useMutation({
    mutationFn: ({ decision }: { decision: 'Approved' | 'Rejected' }) =>
      demoService.decideApproval(selected!.id, decision, comment),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['overview'] })
      setSelected(null)
      setConfirm(null)
      setComment('')
    },
  })
  const list = data.filter(
    (a) =>
      (status === 'All' || a.status === status) &&
      `${a.agent} ${a.action} ${a.id}`.toLowerCase().includes(search.toLowerCase()),
  )
  const tone = (r: string) =>
    r === 'Critical' || r === 'High' ? 'red' : r === 'Medium' ? 'amber' : 'green'
  return (
    <Page title="Human approvals" description="Review sensitive agent actions before they execute.">
      <div className="metrics-grid">
        <Metric
          label="Pending approvals"
          value={data.filter((x) => x.status === 'Pending').length}
          icon={Clock3}
        />
        <Metric
          label="High risk requests"
          value={data.filter((x) => x.risk === 'Critical' || x.risk === 'High').length}
          icon={ShieldAlert}
        />
        <Metric label="Approved today" value="12" icon={CheckCheck} />
        <Metric label="Rejected today" value="03" icon={X} />
      </div>
      <Card className="table-panel">
        <div className="toolbar">
          <div className="tabs">
            {(['All', 'Pending', 'Approved', 'Rejected', 'Escalated', 'Expired'] as const).map(
              (s) => (
                <button
                  key={s}
                  className={status === s ? 'tab-active' : ''}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <label className="filter-search">
            <Search size={15} />
            <input
              placeholder="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>AGENT / PROPOSED ACTION</th>
                <th>TOOL</th>
                <th>RISK</th>
                <th>REQUESTED</th>
                <th>REVIEWER</th>
                <th>APPROVAL</th>
                <th>EXECUTION</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} onClick={() => setSelected(a)} className="click-row">
                  <td>
                    <b>{a.agent}</b>
                    <small>
                      {a.action} · {a.id}
                    </small>
                  </td>
                  <td>
                    <code>{a.tool}</code>
                  </td>
                  <td>
                    <Badge tone={tone(a.risk)}>{a.risk}</Badge>
                  </td>
                  <td>{a.time}</td>
                  <td>{a.reviewer}</td>
                  <td>
                    <Badge
                      tone={
                        a.status === 'Pending'
                          ? 'amber'
                          : a.status === 'Approved'
                            ? 'green'
                            : 'neutral'
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td>{a.execution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          <section className="modal detail-modal">
            <header>
              <div>
                <span className="eyebrow">
                  {selected.id} · {selected.time}
                </span>
                <h2>{selected.action}</h2>
                <p>Proposed by {selected.agent}</p>
              </div>
              <button className="icon-button" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="detail-grid">
              <div>
                <small>RISK ASSESSMENT</small>
                <Badge tone={tone(selected.risk)}>{selected.risk} risk</Badge>
              </div>
              <div>
                <small>APPROVAL STATUS</small>
                <Badge tone={selected.status === 'Pending' ? 'amber' : 'green'}>
                  {selected.status}
                </Badge>
              </div>
              <div>
                <small>EXECUTION STATUS</small>
                <Badge tone="neutral">{selected.execution}</Badge>
              </div>
            </div>
            <div className="detail-block">
              <b>Original request</b>
              <p>{selected.request}</p>
            </div>
            <div className="detail-block">
              <b>Proposed tool and parameters</b>
              <code>{selected.tool}</code>
              <pre>{selected.parameters}</pre>
            </div>
            <div className="detail-block risk-explain">
              <b>Why this needs review</b>
              <p>{selected.reason}</p>
              <p>{selected.explanation}</p>
            </div>
            <label className="detail-block">
              <b>
                <MessageSquare size={15} /> Review comment
              </b>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add context for the audit record..."
              />
            </label>
            <div className="demo-note">
              Decision is simulated in this browser session. Approval status is separate from
              execution status.
            </div>
            <footer>
              <button className="secondary-button" onClick={() => setConfirm('Rejected')}>
                <X size={15} /> Reject
              </button>
              <button className="primary-button" onClick={() => setConfirm('Approved')}>
                <Check size={15} /> Approve action
              </button>
            </footer>
            {confirm && (
              <div className="confirm-overlay">
                <Card>
                  <SectionTitle>Confirm {confirm.toLowerCase()}?</SectionTitle>
                  <p>
                    This records a simulated decision for the exact tool and parameter snapshot
                    shown above.
                  </p>
                  <footer>
                    <button className="secondary-button" onClick={() => setConfirm(null)}>
                      Go back
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => mutation.mutate({ decision: confirm })}
                    >
                      Confirm {confirm.toLowerCase()}
                    </button>
                  </footer>
                </Card>
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, ShieldAlert, Clock3, CheckCheck, MessageSquare, Search } from 'lucide-react'
import { type Approval, type ApprovalStatus } from '@/features/dashboard/data'
import { demoService } from '@/features/dashboard/service'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric, SectionTitle } from '@/components/shared/Primitives'
import { useDialog } from '@/hooks/useDialog'
export function ApprovalsPage() {
  const [status, setStatus] = useState<ApprovalStatus | 'All'>('All')
  const [selected, setSelected] = useState<Approval | null>(null)
  const [comment, setComment] = useState('')
  const [confirm, setConfirm] = useState<'Approved' | 'Rejected' | null>(null)
  const [search, setSearch] = useState('')
  const closeDialog = () => setSelected(null)
  const dialogRef = useDialog(Boolean(selected), closeDialog)
  const client = useQueryClient()
  const approvalsQuery = useQuery({
    queryKey: ['approvals'],
    queryFn: demoService.getApprovals,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  })
  const data = approvalsQuery.data ?? []
  const mutation = useMutation({
    mutationFn: ({ decision }: { decision: 'Approved' | 'Rejected' }) =>
      demoService.decideApproval(selected!.id, decision, comment),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['approvals'] })
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
        <Metric label="Approved today" value="0" icon={CheckCheck} />
        <Metric label="Rejected today" value="0" icon={X} />
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
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <strong>No approval requests match these filters</strong>
                      <span>Try another status or search term.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="click-row"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(a)
                    }
                  }}
                >
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
                ))
              )}
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
          <section
            className="modal detail-modal"
            ref={dialogRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-detail-title"
            tabIndex={-1}
          >
            <header>
              <div>
                <span className="eyebrow">
                  {selected.id} · {selected.time}
                </span>
                <h2 id="approval-detail-title">{selected.action}</h2>
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
            <div className="demo-note">Decisions are saved to the governance backend. The waiting agent resumes after the backend verifies the decision and authorization receipt.</div>
            <footer>
              <button className="secondary-button" onClick={() => setConfirm('Rejected')}>
                <X size={15} /> Reject
              </button>
              <button
                className="primary-button"
                disabled={mutation.isPending}
                onClick={() => setConfirm('Approved')}
              >
                <Check size={15} /> Approve action
              </button>
            </footer>
            {confirm && (
              <div className="confirm-overlay">
                <Card
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="approval-confirm-title"
                >
                  <SectionTitle>
                    <span id="approval-confirm-title">Confirm {confirm.toLowerCase()}?</span>
                  </SectionTitle>
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
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ decision: confirm })}
                    >
                      {mutation.isPending ? 'Saving…' : `Confirm ${confirm.toLowerCase()}`}
                    </button>
                  </footer>
                  {mutation.isError && (
                    <p className="field-error" role="alert">
                      We could not save this decision. Try again.
                    </p>
                  )}
                </Card>
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  )
}

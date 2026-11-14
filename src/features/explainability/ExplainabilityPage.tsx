import { useState } from 'react'
import { BookOpen, BrainCircuit, CircleHelp, FileSearch, ShieldCheck } from 'lucide-react'
import { executions } from '@/features/dashboard/data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, SectionTitle } from '@/components/shared/Primitives'
export function ExplainabilityPage() {
  const [execution, setExecution] = useState(executions[1].id)
  const current = executions.find((e) => e.id === execution)!
  return (
    <Page
      title="Explainability"
      description="Explore recorded decisions, evidence, and risk signals from agent runs."
    >
      <div className="explorer-select">
        <label>
          Agent
          <select>
            <option>All agents</option>
            {[...new Set(executions.map((e) => e.agent))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Execution
          <select value={execution} onChange={(e) => setExecution(e.target.value)}>
            {executions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id} · {e.agent}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="explain-grid">
        <div className="explain-main">
          <Card>
            <SectionTitle>
              <BrainCircuit size={18} /> Decision summary
            </SectionTitle>
            <h3>{current.request}</h3>
            <p className="muted">
              The explanation below reflects recorded events from <b>{current.id}</b>. It does not
              add inferred reasoning.
            </p>
            <div className="decision-callout">
              <b>Recorded decision</b>
              <p>
                {current.status === 'Interrupted'
                  ? 'Pause execution and request human review before issuing the vendor payment.'
                  : 'Complete the requested research using retrieved supplier records.'}
              </p>
              <div className="detail-grid">
                <div>
                  <small>RISK</small>
                  <Badge tone={current.risk === 'Critical' ? 'red' : 'green'}>{current.risk}</Badge>
                </div>
                <div>
                  <small>HUMAN REVIEW</small>
                  <Badge>{current.intervention}</Badge>
                </div>
                <div>
                  <small>TOOLS USED</small>
                  <b>{current.tools}</b>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <SectionTitle>
              <FileSearch size={18} /> Evidence references
            </SectionTitle>
            <div className="evidence-row">
              <div className="evidence-icon">
                <BookOpen size={17} />
              </div>
              <div>
                <b>Execution event log</b>
                <small>
                  {current.id} · event sequence 1–{current.tools + 2}
                </small>
              </div>
              <Badge tone="green">Recorded</Badge>
            </div>
            <div className="evidence-row">
              <div className="evidence-icon">
                <ShieldCheck size={17} />
              </div>
              <div>
                <b>Risk assessment result</b>
                <small>Policy evaluation captured at execution time</small>
              </div>
              <Badge tone="green">Recorded</Badge>
            </div>
            <div className="demo-note">
              <CircleHelp size={15} /> Evidence is limited to events present in this demo trace.
            </div>
          </Card>
        </div>
        <div className="explain-side">
          <Card>
            <SectionTitle>Decision timeline</SectionTitle>
            <div className="trace-list">
              {[
                'User task received',
                'Agent selected tools',
                'Evidence retrieved',
                'Risk assessed',
                current.status === 'Interrupted' ? 'Human review requested' : 'Result returned',
              ].map((s, i) => (
                <div className="trace-item" key={s}>
                  <span className="trace-icon">
                    <span>{i + 1}</span>
                  </span>
                  <div>
                    <b>{s}</b>
                    <small>{['10:39:01', '10:39:03', '10:39:06', '10:39:10', '10:39:12'][i]}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>Limitations</SectionTitle>
            <p className="muted">
              Alternative decisions and model uncertainty are not included in the recorded demo
              events for this execution.
            </p>
          </Card>
        </div>
      </div>
    </Page>
  )
}

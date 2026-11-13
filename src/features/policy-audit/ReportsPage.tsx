import { useState } from 'react'
import { Download, FileCheck2, FileText, Search } from 'lucide-react'
import { executions } from '@/features/dashboard/data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric, SectionTitle } from '@/components/shared/Primitives'
export function ReportsPage() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const reports = executions
    .map((e, i) => ({
      id: `RPT-${410 + i}`,
      agent: e.agent,
      execution: e.id,
      date: e.started,
      risk: e.risk,
      intervention: e.intervention,
      integrity: 'Not verified',
    }))
    .filter((r) => `${r.id} ${r.agent} ${r.execution}`.toLowerCase().includes(query.toLowerCase()))
  const download = (row: (typeof reports)[number]) => {
    const blob = new Blob(
      [
        JSON.stringify(
          { ...row, demo: true, events: ['task_received', 'risk_assessed', 'result_recorded'] },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${row.id.toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <Page
      title="Transparency reports"
      description="Review execution provenance and export demo audit records."
      action={<Badge tone="amber">Integrity is not verified</Badge>}
    >
      <div className="metrics-grid">
        <Metric label="Total reports" value="248" icon={FileText} />
        <Metric label="Recent reports" value="18" icon={FileCheck2} />
        <Metric label="Human intervention" value="36" icon={FileCheck2} />
        <Metric label="High risk actions" value="12" icon={FileText} />
      </div>
      <Card className="table-panel">
        <div className="toolbar">
          <label className="filter-search">
            <Search size={15} />
            <input
              placeholder="Search reports..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REPORT / AGENT</th>
                <th>EXECUTION</th>
                <th>CREATED</th>
                <th>RISK</th>
                <th>HUMAN REVIEW</th>
                <th>INTEGRITY</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.id}</b>
                    <small>{r.agent}</small>
                  </td>
                  <td>{r.execution}</td>
                  <td>{r.date}</td>
                  <td>
                    <Badge tone={r.risk === 'Critical' || r.risk === 'High' ? 'red' : 'green'}>
                      {r.risk}
                    </Badge>
                  </td>
                  <td>{r.intervention}</td>
                  <td>
                    <Badge tone="amber">Not verified</Badge>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setActive(active === r.id ? null : r.id)}
                    >
                      Details
                    </button>
                    <button
                      title="Download demo JSON"
                      className="icon-button"
                      onClick={() => download(r)}
                    >
                      <Download size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {active && (
          <div className="report-detail">
            <SectionTitle>{active} · Report details</SectionTitle>
            <p>
              Execution provenance, recorded risk assessment, human review status, tool activity,
              and evidence references are included in this demonstration record.
            </p>
            <button
              className="secondary-button"
              onClick={() => {
                const row = reports.find((r) => r.id === active)
                if (row) download(row)
              }}
            >
              <Download size={15} /> Download demo JSON
            </button>
          </div>
        )}
      </Card>
    </Page>
  )
}

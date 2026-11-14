import { ArrowRight, Bot, FolderKanban, Plus, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from './data'
import { demoService } from './service'
import { Badge, WorkspaceTabs } from '@/components/shared/Primitives'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/hooks/useDialog'
export function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')
  const [form, setForm] = useState({ name: '', description: '', type: 'Agent system', risk: 'Medium', accent: '#198f70' })
  const closeDialog = () => setOpen(false)
  const dialogRef = useDialog(open, closeDialog)
  useEffect(() => {
    demoService.getProjects().then(setItems).catch(() => setError('Could not load projects')).finally(() => setLoading(false))
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const created = await demoService.createProject(form)
      setItems((current) => [...current, {
        id: created.id, name: created.name, description: created.description, type: created.type,
        agentCount: created.agent_count ?? 0, executions: created.executions ?? 0,
        pendingApprovals: created.pending_approvals ?? 0, risk: created.risk, lastActivity: created.last_activity,
        accent: created.accent,
      }])
      setCreatedId(created.id)
      setForm({ name: '', description: '', type: 'Agent system', risk: 'Medium', accent: '#198f70' }); setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project')
    } finally { setSaving(false) }
  }
  return (
    <main className="projects-page">
      <WorkspaceTabs active="projects" />
      <div className="projects-header">
        <div>
          <h1>Your projects</h1>
          <p>Choose a project to open its governance dashboard.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="project-count">{items.length} active projects</span>
          <Button type="button" onClick={() => setOpen(true)}><Plus size={16} /> Add project</Button>
        </div>
      </div>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog()
          }}
        >
          <form
            className="modal project-modal"
            ref={dialogRef as React.RefObject<HTMLFormElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            tabIndex={-1}
            onSubmit={submit}
          >
            <header>
              <div>
                <span className="eyebrow">Workspace setup</span>
                <h2 id="create-project-title">Create a new project</h2>
                <p>Set up the governance profile for your AI project.</p>
              </div>
              <button type="button" className="icon-button" aria-label="Close dialog" onClick={closeDialog}>
                <X size={18} />
              </button>
            </header>
            <div className="project-modal-fields">
              <label>
                Project name
                <input required minLength={2} placeholder="e.g. Atlas Research Network" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                Description
                <textarea placeholder="What will this project govern?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <div className="project-modal-row">
                <label>
                  Project type
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Agent system</option><option>Multi-agent system</option></select>
                </label>
                <label>
                  Risk profile
                  <select value={form.risk} onChange={(event) => setForm({ ...form, risk: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
                </label>
              </div>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <footer>
              <Button type="button" className="secondary-button" onClick={closeDialog}>Cancel</Button>
              <Button disabled={saving}>{saving ? 'Creating…' : 'Create project'}</Button>
            </footer>
          </form>
        </div>
      )}
      {createdId && <p role="status" style={{ marginBottom: 20 }}>Project created. Project ID: <code>{createdId}</code></p>}
      {loading && <p>Loading projects…</p>}
      {!loading && <div className="projects-grid">
        {items.map((project) => (
          <Link className="project-card" to={`/projects/${project.id}/dashboard`} key={project.id}>
            <div className="project-card-top">
              <div className="project-icon" style={{ background: project.accent }}>
                <FolderKanban size={20} />
              </div>
              <ArrowRight size={17} />
            </div>
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <div className="project-stats">
              <span>
                <Bot size={14} />
                <b>{project.agentCount}</b> agents
              </span>
              <span>
                <ShieldCheck size={14} />
                <b>{project.executions.toLocaleString()}</b> runs
              </span>
            </div>
            <div className="project-footer">
              <Badge
                tone={project.risk === 'Critical' || project.risk === 'High' ? 'red' : 'amber'}
              >
                {project.risk} risk
              </Badge>
              <small>Active {project.lastActivity}</small>
            </div>
          </Link>
        ))}
      </div>}
    </main>
  )
}

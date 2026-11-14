import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bot, Plus, Search, X, Zap, CircleAlert, Activity, Check, Copy, KeyRound } from 'lucide-react'
import { agents } from '@/features/dashboard/data'
import { Page } from '@/components/layout/Page'
import { Badge, Card, Metric } from '@/components/shared/Primitives'
import { useDialog } from '@/hooks/useDialog'
import { demoService } from '@/features/dashboard/service'
import { useParams } from 'react-router-dom'
const schema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters'),
  description: z.string().min(5, 'Add a short description'),
  framework: z.string().min(1),
  endpoint: z.string().url('Enter a valid endpoint URL'),
})
type FormData = z.infer<typeof schema>
export function AgentsPage() {
  const { projectId = '' } = useParams()
  const client = useQueryClient()
  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: demoService.getAgents })
  const removeAgent = useMutation({
    mutationFn: demoService.deleteAgent,
    onSuccess: () => { client.invalidateQueries({ queryKey: ['agents'] }); setAgentToDelete(null) },
  })
  const registerAgent = useMutation({ mutationFn: (input: FormData) => demoService.registerAgent(projectId, input), onSuccess: () => { client.invalidateQueries({ queryKey: ['agents'] }); reset(); setOpen(false) } })
  const createKey = useMutation({ mutationFn: (name: string) => demoService.createProjectApiKey(projectId, name), onSuccess: (result) => { setApiKey(result.api_key); setCopied(false) } })
  const [open, setOpen] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyName, setKeyName] = useState('Dashboard SDK key')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const closeDialog = () => setOpen(false)
  const closeKeyDialog = () => setKeyOpen(false)
  const closeDeleteDialog = () => setAgentToDelete(null)
  const dialogRef = useDialog(open, closeDialog)
  const keyDialogRef = useDialog(keyOpen, closeKeyDialog)
  const deleteDialogRef = useDialog(Boolean(agentToDelete), closeDeleteDialog)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const list = (agentsQuery.data ?? agents).filter((a) => `${a.name} ${a.framework}`.toLowerCase().includes(search.toLowerCase()))
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
      <Card className="table-panel sdk-credentials-card">
        <div className="sdk-credentials-icon"><KeyRound size={18} /></div>
        <div className="sdk-credentials-copy">
          <h3>SDK credentials</h3>
          <p className="muted">Create a project API key to authenticate requests from your SDK.</p>
        </div>
        <button className="primary-button" onClick={() => { createKey.reset(); setApiKey(''); setCopyError(''); setKeyOpen(true) }}>
          Create API key
        </button>
      </Card>
      <div className="metrics-grid">
        <Metric
          label="Total agents"
          value={list.length}
          delta="Across 4 frameworks"
          icon={Bot}
        />
        <Metric label="Active" value={list.filter((agent) => agent.status === 'Active').length} delta="Processing normally" icon={Activity} />
        <Metric label="Inactive" value={list.filter((agent) => agent.status !== 'Active').length} delta="Available to run" icon={Zap} />
        <Metric label="Needs attention" value={list.filter((agent) => agent.risk === 'Critical').length} delta="Review critical risk profile" icon={CircleAlert} />
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
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <strong>No agents match your search</strong>
                      <span>Try a different name or framework.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    <small>{a.description}</small>
                    <small>ID: {a.id}</small>
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
                  <td><button className="secondary-button" onClick={() => setAgentToDelete({ id: a.id, name: a.name })}>Delete</button></td>
                </tr>
                ))
              )}
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
            ref={dialogRef as React.RefObject<HTMLFormElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-agent-title"
            tabIndex={-1}
            onSubmit={handleSubmit((values) => registerAgent.mutate(values))}
          >
            <header>
              <div>
                <h2 id="connect-agent-title">Connect an agent</h2>
                <p>Registers this agent with the current project.</p>
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
                Register agent
              </button>
            </footer>
            {removeAgent.isError && <p className="field-error" role="alert">{removeAgent.error instanceof Error ? removeAgent.error.message : 'The agent could not be deleted.'}</p>}
          </form>
        </div>
      )}
      {keyOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeKeyDialog()
          }}
        >
          <section
            className="modal api-key-modal"
            ref={keyDialogRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-api-key-title"
            tabIndex={-1}
          >
            <header>
              <div>
                <span className="eyebrow">Project credentials</span>
                <h2 id="create-api-key-title">{apiKey ? 'Your API key is ready' : 'Create an API key'}</h2>
                <p>{apiKey ? 'Copy this key now. For security, it will not be shown again.' : 'Use this key to authenticate your project SDK requests.'}</p>
              </div>
              <button type="button" className="icon-button" aria-label="Close API key dialog" onClick={closeKeyDialog}>
                <X size={18} />
              </button>
            </header>
            {!apiKey ? (
              <form className="api-key-form" onSubmit={(event) => { event.preventDefault(); createKey.mutate(keyName) }}>
                <label>
                  Key name
                  <input
                    required
                    minLength={2}
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    placeholder="e.g. Production SDK"
                  />
                </label>
                {createKey.error && <p className="field-error" role="alert">{createKey.error instanceof Error ? createKey.error.message : 'Could not create API key'}</p>}
                <div className="demo-note"><KeyRound size={14} /> Keep this key private. Anyone with it can access this project.</div>
                <footer>
                  <button type="button" className="secondary-button" onClick={closeKeyDialog}>Cancel</button>
                  <button className="primary-button" type="submit" disabled={createKey.isPending}>
                    {createKey.isPending ? 'Creating…' : 'Create key'}
                  </button>
                </footer>
              </form>
            ) : (
              <div className="api-key-result">
                <div className="api-key-value">
                  <code>{apiKey}</code>
                  <button
                    type="button"
                    className="api-key-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey).then(() => { setCopied(true); setCopyError('') }).catch(() => setCopyError('Could not copy the key.'))
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {copyError && <p className="field-error" role="alert">{copyError}</p>}
                <div className="demo-note"><strong>Save this key securely.</strong> You will not be able to view it again after closing this window.</div>
                <footer>
                  <button type="button" className="primary-button" onClick={closeKeyDialog}>Done</button>
                </footer>
              </div>
            )}
          </section>
        </div>
      )}
      {agentToDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog()
          }}
        >
          <section
            className="modal delete-modal"
            ref={deleteDialogRef as React.RefObject<HTMLElement>}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-agent-title"
            aria-describedby="delete-agent-description"
            tabIndex={-1}
          >
            <div className="delete-modal-icon"><CircleAlert size={22} /></div>
            <div>
              <h2 id="delete-agent-title">Delete agent?</h2>
              <p id="delete-agent-description">
                You are about to delete <strong>{agentToDelete.name}</strong>. This action cannot be undone.
              </p>
            </div>
            <footer>
              <button type="button" className="secondary-button" onClick={closeDeleteDialog}>Cancel</button>
              <button
                type="button"
                className="danger-button"
                disabled={removeAgent.isPending}
                onClick={() => removeAgent.mutate(agentToDelete.id)}
              >
                {removeAgent.isPending ? 'Deleting…' : 'Delete agent'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </Page>
  )
}

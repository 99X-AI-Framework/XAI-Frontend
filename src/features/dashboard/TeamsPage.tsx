import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users, FolderKanban, Clock3, Search, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { projects } from './data'
import { demoService } from './service'
import { Badge, Card, Metric, WorkspaceTabs } from '@/components/shared/Primitives'
import { Page } from '@/components/layout/Page'
const inviteSchema = z.object({
  name: z.string().min(2, 'Enter the member name'),
  email: z.string().email('Enter a valid email'),
  projectIds: z.array(z.string()).min(1, 'Select at least one project'),
})
type InviteForm = z.infer<typeof inviteSchema>
export function TeamsPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | 'Active' | 'Invited'>('All')
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: demoService.getTeamMembers,
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { projectIds: [] },
  })
  const invite = useMutation({
    mutationFn: demoService.addTeamMember,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['team-members'] })
      reset()
      setOpen(false)
    },
  })
  const membership = useMutation({
    mutationFn: ({
      memberId,
      projectId,
      hasAccess,
    }: {
      memberId: string
      projectId: string
      hasAccess: boolean
    }) => demoService.updateMembership(memberId, projectId, hasAccess),
    onSuccess: () => client.invalidateQueries({ queryKey: ['team-members'] }),
  })
  const members = useMemo(
    () =>
      data.filter(
        (member) =>
          (status === 'All' || member.status === status) &&
          `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query, status],
  )
  return (
    <main className="teams-page">
      <Page
        title="Teams"
        description="Manage who can access the projects in your workspace."
        leading={<WorkspaceTabs active="teams" />}
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Invite member
          </button>
        }
      >
        <div className="metrics-grid">
          <Metric label="Team members" value={data.length} icon={Users} />
          <Metric
            label="Active members"
            value={data.filter((m) => m.status === 'Active').length}
            icon={Check}
          />
          <Metric label="Projects" value={projects.length} icon={FolderKanban} />
          <Metric
            label="Pending invitations"
            value={data.filter((m) => m.status === 'Invited').length}
            icon={Clock3}
          />
        </div>
        <Card className="table-panel">
          <div className="toolbar">
            <div className="team-toolbar">
              <label className="filter-search">
                <Search size={16} />
                <input
                  placeholder="Search members..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                className="select-filter"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option>All</option>
                <option>Active</option>
                <option>Invited</option>
              </select>
            </div>
            <span className="muted">{members.length} members</span>
          </div>
          <div className="table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>ROLE</th>
                  {projects.map((project) => (
                    <th key={project.id}>
                      <Link to={`/projects/${project.id}/dashboard`}>{project.name}</Link>
                    </th>
                  ))}
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar">{member.initials}</div>
                        <div>
                          <b>{member.name}</b>
                          <small>{member.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={member.role === 'Team Leader' ? 'blue' : 'neutral'}>
                        {member.role}
                      </Badge>
                    </td>
                    {projects.map((project) => {
                      const hasAccess = member.projectIds.includes(project.id)
                      return (
                        <td key={project.id}>
                          <button
                            className={`access-toggle ${hasAccess ? 'access-on' : ''}`}
                            aria-label={`${hasAccess ? 'Remove' : 'Add'} ${member.name} ${project.name} access`}
                            disabled={member.id === 'usr-jordan'}
                            onClick={() =>
                              membership.mutate({
                                memberId: member.id,
                                projectId: project.id,
                                hasAccess: !hasAccess,
                              })
                            }
                          >
                            {hasAccess ? <Check size={15} /> : <X size={15} />}
                          </button>
                        </td>
                      )
                    })}
                    <td>
                      <Badge tone={member.status === 'Active' ? 'green' : 'amber'}>
                        {member.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {open && (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false)
            }}
          >
            <form
              className="modal invite-modal"
              onSubmit={handleSubmit((values) => invite.mutate(values))}
            >
              <header>
                <div>
                  <h2>Add account</h2>
                  <p>Invite a teammate to the demo workspace.</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </header>
              <label>
                Full name
                <input {...register('name')} placeholder="e.g. Alex Morgan" />
                {errors.name && <small className="field-error">{errors.name.message}</small>}
              </label>
              <label>
                Email address
                <input {...register('email')} type="email" placeholder="alex@example.com" />
                {errors.email && <small className="field-error">{errors.email.message}</small>}
              </label>
              <fieldset>
                <legend>Project access</legend>
                {projects.map((project) => (
                  <label className="project-check" key={project.id}>
                    <input type="checkbox" value={project.id} {...register('projectIds')} />
                    <span>{project.name}</span>
                  </label>
                ))}
                {errors.projectIds && (
                  <small className="field-error">{errors.projectIds.message}</small>
                )}
              </fieldset>
              <footer>
                <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Create invitation
                </button>
              </footer>
            </form>
          </div>
        )}
      </Page>
    </main>
  )
}

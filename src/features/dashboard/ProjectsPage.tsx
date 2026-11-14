import { ArrowRight, Bot, FolderKanban, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { projects } from './data'
import { Badge, WorkspaceTabs } from '@/components/shared/Primitives'
export function ProjectsPage() {
  return (
    <main className="projects-page">
      <WorkspaceTabs active="projects" />
      <div className="projects-header">
        <div>
          <h1>Your projects</h1>
          <p>Choose a project to open its governance dashboard.</p>
        </div>
        <span className="project-count">{projects.length} active projects</span>
      </div>
      <div className="projects-grid">
        {projects.map((project) => (
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
      </div>
    </main>
  )
}

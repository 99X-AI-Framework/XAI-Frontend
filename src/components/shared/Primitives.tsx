import type { HTMLAttributes, ReactNode } from 'react'
import { FolderKanban, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'
export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn('panel', className)} {...props}>
      {children}
    </section>
  )
}
export function Metric({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string
  value: string | number
  delta?: string
  icon: React.ComponentType<{ size?: number }>
}) {
  return (
    <Card className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <i>
          <Icon size={17} />
        </i>
      </div>
      <strong>{value}</strong>
      {delta && <small>{delta}</small>}
    </Card>
  )
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
export function SectionTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {meta}
    </div>
  )
}

export function AsyncState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="async-state" role="status">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </Card>
  )
}

export function WorkspaceTabs({ active }: { active: 'projects' | 'teams' }) {
  return (
    <nav className="workspace-tabs" aria-label="Workspace navigation">
      <Link className={`workspace-tab ${active === 'projects' ? 'tab-selected' : ''}`} to="/projects">
        <FolderKanban size={18} /> Projects
      </Link>
      <Link className={`workspace-tab ${active === 'teams' ? 'tab-selected' : ''}`} to="/teams">
        <Users size={18} /> Teams
      </Link>
    </nav>
  )
}

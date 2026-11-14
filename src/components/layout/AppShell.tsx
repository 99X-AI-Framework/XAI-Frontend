import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { projects } from '@/features/dashboard/data'
import {
  Activity,
  Bell,
  ChevronLeft,
  ClipboardCheck,
  FileClock,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Workflow,
} from 'lucide-react'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const location = useLocation()
  const { projectId } = useParams()
  const project = projects.find((item) => item.id === projectId)
  const base = projectId ? `/projects/${projectId}` : '/settings'
  const links = projectId
    ? [
        { to: `${base}/dashboard`, label: 'Overview', icon: LayoutDashboard },
        { to: `${base}/approvals`, label: 'Human approvals', icon: ClipboardCheck },
        { to: `${base}/executions`, label: 'Execution history', icon: FileClock },
        { to: `${base}/explainability`, label: 'Explainability', icon: Workflow },
        { to: `${base}/reports`, label: 'Transparency reports', icon: FileText },
      ]
    : [{ to: '/settings', label: 'Settings', icon: Settings }]
  const current = links.find((link) => link.to === location.pathname) ?? links[0]
  return (
    <div className={dark ? 'theme-dark min-h-screen' : 'min-h-screen'}>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          {!collapsed && (
            <div>
              <strong>
                sentinel<span>.</span>
              </strong>
            </div>
          )}
          <button
            aria-label="Toggle sidebar"
            className="icon-button collapse-button"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft size={17} />
          </button>
        </div>
        {!collapsed && (
          <Link className="workspace project-workspace" to="/">
            <span className="workspace-dot" /> {project?.name ?? 'Workspace'}{' '}
            <span className="workspace-chevron">⌃</span>
          </Link>
        )}
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span>{!collapsed && label}</span>
              {!collapsed && label === 'Human approvals' && <b className="nav-count">3</b>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-bottom">
            <div className="sidebar-status">
              <span className="live-dot" /> Systems operational
            </div>
            <div className="user-card">
              <div className="avatar">JD</div>
              <div className="user-copy">
                <b>Jordan Davis</b>
              </div>
              <span>···</span>
            </div>
          </div>
        )}
      </aside>
      <section className="main-area">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu icon-button"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumbs">
            <b>{current.label}</b>
          </div>
          <div className="top-actions">
            <label className="global-search">
              <Search size={16} />
              <input aria-label="Search" placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </label>
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notification-wrap">
              <button
                aria-label="Notifications"
                className="icon-button notification-button"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={18} />
                <i />
              </button>
              {notifications && (
                <div className="notification-pop">
                  <b>Notifications</b>
                  <p>3 approval requests need review.</p>
                  <p>Agent Atlas completed an execution.</p>
                </div>
              )}
            </div>
            <div className="top-avatar">JD</div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}

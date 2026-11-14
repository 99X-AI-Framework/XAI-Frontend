import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/components/ui/authentication'
import { projects } from '@/features/dashboard/data'
import {
  Activity,
  Bot,
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('demo-theme')
    return saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })
  const [notifications, setNotifications] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { projectId } = useParams()
  const project = projects.find((item) => item.id === projectId)
  const base = projectId ? `/projects/${projectId}` : '/settings'
  const links = projectId
    ? [
        { to: `${base}/dashboard`, label: 'Overview', icon: LayoutDashboard },
        { to: `${base}/agents`, label: 'Agents', icon: Bot },
        { to: `${base}/approvals`, label: 'Human approvals', icon: ClipboardCheck },
        { to: `${base}/executions`, label: 'Execution history', icon: FileClock },
        { to: `${base}/explainability`, label: 'Explainability', icon: Workflow },
        { to: `${base}/reports`, label: 'Transparency reports', icon: FileText },
      ]
    : [{ to: '/settings', label: 'Settings', icon: Settings }]
  const current = links.find((link) => link.to === location.pathname) ?? links[0]
  const searchResults = links.filter((link) =>
    link.label.toLowerCase().includes(search.trim().toLowerCase()),
  )

  useEffect(() => {
    localStorage.setItem('demo-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<string>).detail
      setDark(theme === 'dark')
    }
    window.addEventListener('demo-theme-change', handleThemeChange)
    return () => window.removeEventListener('demo-theme-change', handleThemeChange)
  }, [])

  return (
    <div className={dark ? 'theme-dark min-h-screen' : 'min-h-screen'}>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
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
          <div className="workspace-switcher">
            <button
              type="button"
              className="workspace project-workspace"
              aria-expanded={workspaceOpen}
              aria-haspopup="listbox"
              onClick={() => setWorkspaceOpen((value) => !value)}
            >
              <span className="workspace-dot" /> {project?.name ?? 'Workspace'}{' '}
              <span className="workspace-chevron">⌃</span>
            </button>
            {workspaceOpen && (
              <div className="workspace-menu" role="listbox" aria-label="Select project">
                {projects.map((item) => (
                  <Link
                    key={item.id}
                    role="option"
                    aria-selected={item.id === projectId}
                    to={`/projects/${item.id}/dashboard`}
                    onClick={() => setWorkspaceOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link role="option" to="/projects" onClick={() => setWorkspaceOpen(false)}>
                  View all projects
                </Link>
              </div>
            )}
          </div>
        )}
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{!collapsed && label}</span>
              {!collapsed && label === 'Human approvals' && <b className="nav-count">0</b>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-bottom">
            <div className="sidebar-status">
              <span className="live-dot" /> Systems operational
            </div>
            <div className="user-card">
              <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() ?? 'JD'}</div>
              <div className="user-copy">
                <b>{user?.name ?? 'User'}</b>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={async () => {
                  await logout()
                  navigate('/login', { replace: true })
                }}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </aside>
      <section className="main-area">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu icon-button"
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumbs">
            <b>{current.label}</b>
          </div>
          <div className="top-actions">
            <form
              className="global-search"
              onSubmit={(event) => {
                event.preventDefault()
                const result = searchResults[0]
                if (result) {
                  navigate(result.to)
                  setSearch('')
                }
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search workspace"
                placeholder="Search workspace..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
              {search && (
                <div className="search-results" role="listbox" aria-label="Search results">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        type="button"
                        key={result.to}
                        role="option"
                        onClick={() => {
                          navigate(result.to)
                          setSearch('')
                        }}
                      >
                        {result.label}
                      </button>
                    ))
                  ) : (
                    <span>No matching workspace pages</span>
                  )}
                </div>
              )}
            </form>
            <button
              aria-label="Toggle theme"
              aria-pressed={dark}
              className="icon-button"
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notification-wrap">
              <button
                aria-label="Notifications"
                aria-expanded={notifications}
                aria-haspopup="dialog"
                className="icon-button notification-button"
                onClick={() => setNotifications((value) => !value)}
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

import { useState } from 'react'
import { Bell, Monitor, Moon, Sun, UserRound, Save } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Card, SectionTitle } from '@/components/shared/Primitives'
export function SettingsPage() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('demo-theme')
    return saved === 'dark' ? 'Dark' : saved === 'system' ? 'System' : 'Light'
  })
  const [saved, setSaved] = useState(false)
  return (
    <Page title="Settings" description="Manage this browser’s workspace preferences.">
      <div className="settings-grid">
        <Card>
          <SectionTitle>
            <UserRound size={17} /> Profile
          </SectionTitle>
          <label className="form-label">
            Display name
            <input placeholder="Your name" />
          </label>
          <label className="form-label">
            Email
            <input defaultValue="jordan@example.com" type="email" />
          </label>
          <div className="demo-note">Profile changes are local demo preferences.</div>
          <button className="primary-button" onClick={() => setSaved(true)}>
            <Save size={15} /> Save profile
          </button>
        </Card>
        <Card>
          <SectionTitle>
            <Bell size={17} /> Notifications
          </SectionTitle>
          {[
            'Pending approval requests',
            'High risk agent actions',
            'Agent failures',
            'Execution completed',
          ].map((s, i) => (
            <label className="toggle-row" key={s}>
              <span>{s}</span>
              <input type="checkbox" defaultChecked={i < 3} />
            </label>
          ))}
          <div className="demo-note">Notification preferences are not synced to a backend.</div>
        </Card>
        <Card>
          <SectionTitle>Appearance</SectionTitle>
          <div className="theme-options">
            {[
              ['Light', Sun],
              ['Dark', Moon],
              ['System', Monitor],
            ].map(([name, Icon]) => (
              <button
                key={name as string}
                className={theme === name ? 'theme-choice selected' : 'theme-choice'}
                onClick={() => {
                  const t = name as string
                  setTheme(t)
                  const normalized = t.toLowerCase()
                  localStorage.setItem('demo-theme', normalized)
                  const resolved = normalized === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : normalized
                  document.documentElement.dataset.theme = resolved
                  window.dispatchEvent(new CustomEvent('demo-theme-change', { detail: resolved }))
                }}
              >
                <Icon size={17} />
                {name as string}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Security and approvals</SectionTitle>
          <p className="muted">
            API keys, sessions, authentication, reviewer permissions, and default reviewers require
            backend support and are not available in this demo.
          </p>
          <span className="live-pill">SERVER CONFIGURATION REQUIRED</span>
        </Card>
        {saved && <p className="success-message">Demo profile saved for this session.</p>}
      </div>
    </Page>
  )
}

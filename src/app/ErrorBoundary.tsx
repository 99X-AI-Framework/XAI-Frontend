import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-error-page" role="alert">
          <span className="eyebrow">SENTINEL / APPLICATION ERROR</span>
          <h1>Something went wrong</h1>
          <p>We could not render this screen. Reload the page or return to your projects.</p>
          <div className="app-error-actions">
            <button className="primary-button" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="secondary-button" href="/projects">
              Back to projects
            </a>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

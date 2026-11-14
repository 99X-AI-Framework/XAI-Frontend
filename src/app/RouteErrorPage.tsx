import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const message =
    isRouteErrorResponse(error) && error.status === 404
      ? 'The page you requested does not exist.'
      : 'This page could not be loaded right now.'

  return (
    <main className="app-error-page" role="alert">
      <span className="eyebrow">SENTINEL / PAGE NOT AVAILABLE</span>
      <h1>We could not find that page</h1>
      <p>{message} Check the address or return to your workspace.</p>
      <div className="app-error-actions">
        <Link className="primary-button" to="/projects">
          Back to projects
        </Link>
        <Link className="secondary-button" to="/">
          Go to home
        </Link>
      </div>
    </main>
  )
}

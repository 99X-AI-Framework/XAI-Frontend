import type { ReactNode } from 'react'
export function Page({
  title,
  description,
  action,
  leading,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  leading?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      {leading}
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL CENTER / {title.toUpperCase()}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  )
}

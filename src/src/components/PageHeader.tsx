import { Link } from 'react-router-dom'

type HeaderAction = {
  disabled?: boolean
  href?: string
  label: string
  onClick?: () => void
  variant?: 'outline' | 'primary' | 'error'
}

type PageHeaderProps = {
  title: string
  subtitle?: string
  backAction?: HeaderAction
  nextAction?: HeaderAction
  restartAction: HeaderAction
}

function getButtonClassName(variant: HeaderAction['variant']) {
  switch (variant) {
    case 'primary':
      return 'btn btn-primary'
    case 'error':
      return 'btn btn-outline btn-error'
    default:
      return 'btn btn-outline'
  }
}

function renderAction(action?: HeaderAction) {
  if (!action) {
    return null
  }

  const className = getButtonClassName(action.variant)

  if (action.href) {
    return (
      <Link aria-disabled={action.disabled} className={className} to={action.href}>
        {action.label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {action.label}
    </button>
  )
}

export function PageHeader({
  title,
  subtitle,
  backAction,
  nextAction,
  restartAction,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-[var(--heading-font)] text-4xl text-neutral">{title}</h1>
        {subtitle ? <p className="mt-2 text-base text-base-content/60">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {renderAction(backAction)}
        {renderAction(nextAction)}
        <div className="mx-1 h-8 w-px bg-base-300" />
        {renderAction(restartAction)}
      </div>
    </div>
  )
}

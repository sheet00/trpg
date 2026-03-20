import { useNavigate } from 'react-router-dom'

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
  titleClassName?: string
}

function getButtonClassName(variant: HeaderAction['variant']) {
  switch (variant) {
    case 'primary':
      return 'btn btn-primary text-base'
    case 'error':
      return 'btn btn-outline btn-error text-base'
    default:
      return 'btn btn-outline text-base'
  }
}

function renderAction(action: HeaderAction | undefined, navigate: ReturnType<typeof useNavigate>) {
  if (!action) {
    return null
  }

  const className = getButtonClassName(action.variant)
  const href = action.href

  if (typeof href === 'string') {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          if (action.disabled) {
            return
          }

          navigate(href)
        }}
        disabled={action.disabled}
      >
        {action.label}
      </button>
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
  titleClassName,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-base-300 bg-base-100/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-4">
        <div className="min-w-0">
          <h2
            className={
              titleClassName ?? 'page-header-title font-[var(--heading-font)] text-neutral'
            }
          >
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-base text-base-content/60">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {renderAction(backAction, navigate)}
          {renderAction(nextAction, navigate)}
          <div className="mx-1 h-8 w-px bg-base-300" />
          {renderAction(restartAction, navigate)}
        </div>
      </div>
    </header>
  )
}

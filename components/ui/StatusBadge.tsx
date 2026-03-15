interface StatusBadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const variantClasses: Record<StatusBadgeProps['variant'], string> = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-500 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  neutral: 'bg-bg-secondary text-text-muted border-border',
}

export default function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}

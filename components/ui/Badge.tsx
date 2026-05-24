type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'db-badge db-badge-success',
  warning: 'db-badge db-badge-warning',
  danger:  'db-badge db-badge-danger',
  info:    'db-badge db-badge-info',
  muted:   'db-badge db-badge-muted',
};

const dotColors: Record<BadgeVariant, string> = {
  success: '#16a34a',
  warning: '#d97706',
  danger:  '#dc2626',
  info:    '#2563eb',
  muted:   '#9c8e7a',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'info', children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColors[variant], display: 'inline-block', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
      )}
      {children}
    </span>
  );
}

export function ActiveBadge()   { return <Badge variant="success" dot>Active</Badge>; }
export function ExpiredBadge()  { return <Badge variant="danger"  dot>Expired</Badge>; }
export function DisabledBadge() { return <Badge variant="muted"   dot>Disabled</Badge>; }
export function UnboundBadge()  { return <Badge variant="warning">Unbound</Badge>; }
export function BoundBadge()    { return <Badge variant="success">Bound</Badge>; }

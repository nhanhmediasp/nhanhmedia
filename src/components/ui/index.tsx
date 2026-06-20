'use client';

import React, { ForwardedRef, forwardRef } from 'react';

// ============================================================
// Button
// ============================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef(
  (
    { variant = 'primary', size = 'md', loading, children, className = '', style, ...props }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>
  ) => {
    const baseStyle =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variantStyles: Record<string, React.CSSProperties> = {
      primary:   { background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(161,69,171,0.35)' },
      secondary: { background: 'rgba(108,117,147,0.08)', color: '#566a7f', border: '1px solid rgba(108,117,147,0.12)' },
      outline:   { background: 'transparent', color: '#566a7f', border: '1px solid rgba(108,117,147,0.18)' },
      danger:    { background: 'linear-gradient(135deg,#f87171 0%,#ef4444 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.30)' },
      success:   { background: 'linear-gradient(135deg,#4ade80 0%,#22c55e 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(34,197,94,0.28)' },
      ghost:     { background: 'transparent', color: '#566a7f' },
    };

    const sizes: Record<string, string> = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-4.5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={loading || props.disabled}
        className={`${baseStyle} ${sizes[size]} ${className}`}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ============================================================
// Input
// ============================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef(
  ({ label, error, leftIcon, className = '', ...props }: InputProps, ref: ForwardedRef<HTMLInputElement>) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#697a8d' }}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 z-10 flex items-center pointer-events-none" style={{ color: '#a1acb8' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 focus:outline-none ${leftIcon ? 'pl-10' : ''} ${className}`}
            style={{
              background: '#fff',
              border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(108,117,147,0.18)',
              color: '#1e293b',
              boxShadow: '0 1px 3px rgba(108,117,147,0.06)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#a145ab';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(161,69,171,0.12)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(108,117,147,0.18)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(108,117,147,0.06)';
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
        {error && <span className="block text-xs mt-1 font-medium" style={{ color: '#ef4444' }}>{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================================
// Select
// ============================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef(
  ({ label, error, options, className = '', ...props }: SelectProps, ref: ForwardedRef<HTMLSelectElement>) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#697a8d' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 focus:outline-none cursor-pointer ${className}`}
          style={{
            background: '#fff',
            border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(108,117,147,0.18)',
            color: '#1e293b',
            boxShadow: '0 1px 3px rgba(108,117,147,0.06)',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <span className="block text-xs mt-1 font-medium" style={{ color: '#ef4444' }}>{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ============================================================
// Textarea
// ============================================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef(
  ({ label, error, className = '', ...props }: TextareaProps, ref: ForwardedRef<HTMLTextAreaElement>) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#697a8d' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 focus:outline-none resize-y ${className}`}
          style={{
            background: '#fff',
            border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(108,117,147,0.18)',
            color: '#1e293b',
            boxShadow: '0 1px 3px rgba(108,117,147,0.06)',
          }}
          {...props}
        />
        {error && <span className="block text-xs mt-1 font-medium" style={{ color: '#ef4444' }}>{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================================
// Badge
// ============================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  primary:   { background: '#f3d0f7', color: '#a145ab' },
  secondary: { background: '#f1f5f9', color: '#64748b' },
  success:   { background: '#dcfce7', color: '#16a34a' },
  warning:   { background: '#fef3c7', color: '#d97706' },
  danger:    { background: '#fee2e2', color: '#dc2626' },
  info:      { background: '#cffafe', color: '#0891b2' },
};

export const Badge = ({ children, variant = 'primary', className = '' }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${className}`}
      style={BADGE_STYLES[variant]}
    >
      {children}
    </span>
  );
};

// ============================================================
// Card
// ============================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  statusColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export const Card = ({ children, className = '', style, onClick, statusColor }: CardProps) => {
  const statusColors: Record<string, string> = {
    primary: '#a145ab',
    success: '#22c55e',
    warning: '#f59e0b',
    danger:  '#ef4444',
    info:    '#06b6d4',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid rgba(108,117,147,0.10)',
        boxShadow: '0 2px 8px rgba(108,117,147,0.08)',
        ...style,
      }}
    >
      {statusColor && (
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 3, background: statusColors[statusColor],
          }}
        />
      )}
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`px-7 py-5 relative ${className}`}
    style={{ borderBottom: '1px solid rgba(108,117,147,0.08)' }}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-sm font-bold tracking-tight ${className}`} style={{ color: '#1e293b' }}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-7 py-6 relative ${className}`}>{children}</div>
);

// ============================================================
// Dialog
// ============================================================
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export const Dialog = ({
  isOpen, onClose, onConfirm, title, description,
  confirmText = 'Xác nhận', cancelText = 'Hủy',
  isDanger = false, isLoading = false,
}: DialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}>
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-bold mb-2" style={{ color: '#1e293b' }}>{title}</h3>
          <p className="text-sm" style={{ color: '#697a8d' }}>{description}</p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(108,117,147,0.10)', background: 'rgba(108,117,147,0.025)' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
          <Button variant={isDanger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={isLoading}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Toast
// ============================================================
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastsStore: Toast[] = [];

const notify = () => { toastListeners.forEach((l) => l([...toastsStore])); };

export const showToast = (message: string, type: ToastType = 'success') => {
  const id = Math.random().toString(36).substring(2, 9);
  toastsStore.push({ id, message, type });
  notify();
  setTimeout(() => {
    toastsStore = toastsStore.filter((t) => t.id !== id);
    notify();
  }, 4000);
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    toastListeners.push(setToasts);
    setToasts([...toastsStore]);
    return () => { toastListeners = toastListeners.filter((l) => l !== setToasts); };
  }, []);
  return { toasts, showToast };
};

const TOAST_STYLES: Record<ToastType, React.CSSProperties> = {
  success: { background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#fff' },
  error:   { background: 'linear-gradient(135deg,#f87171,#ef4444)', color: '#fff' },
  info:    { background: 'linear-gradient(135deg,#c060c8,#a145ab)', color: '#fff' },
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  error:   <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  info:    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

export const ToastContainer = () => {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl pointer-events-auto animate-fade-in-up"
          style={{ ...TOAST_STYLES[toast.type], boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
        >
          <div className="shrink-0 opacity-90">{TOAST_ICONS[toast.type]}</div>
          <div className="text-sm font-semibold">{toast.message}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// PageHeader
// ============================================================
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, description, children }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in-up">
    <div>
      <h1 className="text-xl font-black tracking-tight" style={{ color: '#1e293b' }}>{title}</h1>
      {description && <p className="text-sm mt-1 font-medium" style={{ color: '#697a8d' }}>{description}</p>}
    </div>
    {children && (
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">{children}</div>
    )}
  </div>
);

// ============================================================
// StatCard
// ============================================================
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: string; isPositive: boolean };
  className?: string;
}

const ICON_WRAP: Record<string, React.CSSProperties> = {
  primary: { background: 'linear-gradient(135deg,#f3d0f7 0%,#e9b6f0 100%)', color: '#a145ab', boxShadow: '0 4px 12px rgba(161,69,171,0.22)' },
  success: { background: 'linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%)', color: '#16a34a', boxShadow: '0 4px 12px rgba(34,197,94,0.18)' },
  warning: { background: 'linear-gradient(135deg,#fef3c7 0%,#fde68a 100%)', color: '#d97706', boxShadow: '0 4px 12px rgba(245,158,11,0.18)' },
  danger:  { background: 'linear-gradient(135deg,#fee2e2 0%,#fecaca 100%)', color: '#dc2626', boxShadow: '0 4px 12px rgba(239,68,68,0.18)' },
  info:    { background: 'linear-gradient(135deg,#cffafe 0%,#a5f3fc 100%)', color: '#0891b2', boxShadow: '0 4px 12px rgba(6,182,212,0.18)' },
};

export const StatCard = ({ title, value, description, icon, iconColor = 'primary', trend, className = '' }: StatCardProps) => (
  <Card className={`p-6 hover:-translate-y-1 transition-all duration-300 ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1.5 flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest truncate" style={{ color: '#a1acb8' }}>{title}</p>
        <p className="text-2xl font-black leading-none" style={{ color: '#1e293b' }}>{value}</p>
        {(description || trend) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {trend && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                style={trend.isPositive
                  ? { background: '#dcfce7', color: '#16a34a' }
                  : { background: '#fee2e2', color: '#dc2626' }
                }
              >
                {trend.isPositive ? '▲' : '▼'} {trend.value}
              </span>
            )}
            {description && (
              <span className="text-[11px] font-medium" style={{ color: '#a1acb8' }}>{description}</span>
            )}
          </div>
        )}
      </div>
      {icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={ICON_WRAP[iconColor]}
        >
          {icon}
        </div>
      )}
    </div>
  </Card>
);

// ============================================================
// StatusBadge
// ============================================================
export const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' }> = {
    // standard
    PENDING:          { label: 'Chờ duyệt',      variant: 'warning' },
    ACTIVE:           { label: 'Đang chạy',       variant: 'success' },
    RUNNING:          { label: 'Đang chạy',       variant: 'success' },
    EXPIRED:          { label: 'Đã hết hạn',      variant: 'danger' },
    EXPIRED_SOON:     { label: 'Sắp hết hạn',     variant: 'warning' },
    CANCELLED:        { label: 'Đã hủy',          variant: 'secondary' },
    COMPLETED:        { label: 'Hoàn thành',      variant: 'success' },
    PAID:             { label: 'Đã thanh toán',   variant: 'success' },
    UNPAID:           { label: 'Chưa thanh toán', variant: 'warning' },
    NEW:              { label: 'Mới tạo',         variant: 'info' },
    PROCESSING:       { label: 'Đang xử lý',      variant: 'info' },
    REFUNDED:         { label: 'Đã bảo hành',     variant: 'warning' },
  };
  const config = statusConfig[status?.toUpperCase()] || { label: status, variant: 'primary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// ============================================================
// RoleBadge
// ============================================================
export const RoleBadge = ({ role }: { role: string }) => {
  const norm = role.toLowerCase();
  const roleConfig: Record<string, { label: string; variant: 'primary' | 'success' | 'info' | 'warning' }> = {
    admin:         { label: 'Quản trị viên', variant: 'primary' },
    member:        { label: 'Thành viên',    variant: 'info' },
    collaborator:  { label: 'CTV',           variant: 'success' },
    ctv:           { label: 'CTV',           variant: 'success' },
    agency:        { label: 'Đại lý',        variant: 'warning' },
    agent:         { label: 'Đại lý',        variant: 'warning' },
  };
  const config = roleConfig[norm] || { label: role, variant: 'info' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// ============================================================
// EmptyState
// ============================================================
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div
    className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl animate-fade-in"
    style={{ border: '2px dashed rgba(108,117,147,0.16)', background: 'rgba(244,245,251,0.60)' }}
  >
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: '#f4f5fb' }}
    >
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: '#a1acb8' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l-2.25 2.25m2.25-2.25l2.25-2.25M3.75 7.5L5.621 3.75A2.25 2.25 0 017.647 2.5h8.706a2.25 2.25 0 012.026 1.25L18.25 7.5m-14.5 0h14.5"
        />
      </svg>
    </div>
    <h3 className="text-sm font-bold mb-1.5" style={{ color: '#1e293b' }}>{title}</h3>
    <p className="text-sm max-w-sm mb-6" style={{ color: '#a1acb8' }}>{description}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);

// ============================================================
// LoadingSkeleton
// ============================================================
export const LoadingSkeleton = ({ variant = 'card' }: { variant?: 'card' | 'table' | 'form' }) => {
  if (variant === 'table') {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 rounded-xl" style={{ background: '#f1f5f9' }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl" style={{ background: '#f8fafc' }} />
        ))}
      </div>
    );
  }
  if (variant === 'form') {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 rounded-lg w-1/3" style={{ background: '#f1f5f9' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-11 rounded-xl" style={{ background: '#f1f5f9' }} />
          <div className="h-11 rounded-xl" style={{ background: '#f1f5f9' }} />
        </div>
        <div className="h-28 rounded-xl" style={{ background: '#f1f5f9' }} />
        <div className="h-11 rounded-xl w-24 ml-auto" style={{ background: '#f1f5f9' }} />
      </div>
    );
  }
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl" style={{ background: '#f1f5f9' }} />
      ))}
    </div>
  );
};

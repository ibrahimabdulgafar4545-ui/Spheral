import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Reusable Button component aligned with SPHERAL Design System.
 * Supports primary, secondary, danger, and ghost variants across sm, md, lg sizes.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...props
}) {
  // Map variant to styling classes
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };

  // Map size to styling classes
  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${className}
      `.trim()}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="mr-0.5" />}
      {!loading && icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
      {!loading && iconRight && <span className="flex-shrink-0 flex items-center">{iconRight}</span>}
    </button>
  );
}

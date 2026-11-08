import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `held`: amber tint and outline, for a message waiting while its endpoint's circuit is open. */
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'held';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('hkb-badge', `hkb-badge--${variant}`, className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

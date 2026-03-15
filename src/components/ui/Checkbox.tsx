import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="hkb-checkbox-wrapper">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          className={cn('hkb-checkbox', className)}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="hkb-checkbox-label">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

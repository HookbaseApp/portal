import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className={cn('hkb-switch', className)}>
        <input type="checkbox" ref={ref} className="hkb-switch-input" {...props} />
        <span className="hkb-switch-slider" />
      </label>
    );
  }
);

Switch.displayName = 'Switch';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface DeltaBadgeProps {
  before: number;
  after: number;
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
  className?: string;
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  before,
  after,
  size = 'md',
  showArrow = true,
  className,
}) => {
  const delta = after - before;
  const isNegative = delta < 0;
  const isZero = delta === 0;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        sizeClasses[size],
        isZero
          ? 'bg-muted text-muted-foreground'
          : isNegative
          ? 'bg-destructive/10 text-destructive'
          : 'bg-green-500/10 text-green-600',
        className
      )}
    >
      {showArrow && (
        isZero ? (
          <Minus size={iconSizes[size]} />
        ) : isNegative ? (
          <ArrowDown size={iconSizes[size]} />
        ) : (
          <ArrowUp size={iconSizes[size]} />
        )
      )}
      <span>
        {before} → {after}
      </span>
      {!isZero && (
        <span className="opacity-75">
          ({isNegative ? '' : '+'}{delta})
        </span>
      )}
    </motion.div>
  );
};

export const DeltaSummary: React.FC<{
  before: number;
  after: number;
  confirmedBy?: string | null;
  className?: string;
}> = ({ before, after, confirmedBy, className }) => {
  const delta = Math.abs(after - before);
  const action = after < before ? 'took' : 'added';

  return (
    <div className={cn('space-y-2', className)}>
      <DeltaBadge before={before} after={after} size="lg" />
      {confirmedBy && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{confirmedBy}</span> confirmed they {action} {delta} egg{delta !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

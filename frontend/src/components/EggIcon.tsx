import React from 'react';
import { cn } from '@/lib/utils';

interface EggIconProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const EggIcon: React.FC<EggIconProps> = ({ 
  className, 
  size = 24,
  animated = false 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animated && 'egg-bounce', className)}
    >
      <ellipse
        cx="12"
        cy="13.5"
        rx="7"
        ry="8.5"
        fill="currentColor"
        className="text-egg-yellow"
      />
      <ellipse
        cx="12"
        cy="13.5"
        rx="7"
        ry="8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-egg-brown"
      />
      <ellipse
        cx="10"
        cy="10"
        rx="2"
        ry="3"
        fill="currentColor"
        className="text-egg-white opacity-50"
      />
    </svg>
  );
};

export const EggWithCount: React.FC<{
  count: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ count, size = 'md', className }) => {
  const sizes = {
    sm: { egg: 32, text: 'text-sm' },
    md: { egg: 48, text: 'text-lg' },
    lg: { egg: 72, text: 'text-2xl' },
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <EggIcon size={sizes[size].egg} animated />
      <span 
        className={cn(
          'absolute font-bold text-egg-brown',
          sizes[size].text
        )}
        style={{ marginTop: '4px' }}
      >
        {count}
      </span>
    </div>
  );
};

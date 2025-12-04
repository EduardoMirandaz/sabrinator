import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EggWithCount } from './EggIcon';
import { Card, CardContent } from '@/components/ui/card';

interface EggCardProps {
  currentCount: number;
  previousCount?: number;
  lastUpdated?: string;
  className?: string;
}

export const EggCard: React.FC<EggCardProps> = ({
  currentCount,
  previousCount,
  lastUpdated,
  className,
}) => {
  const delta = previousCount !== undefined ? currentCount - previousCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('gradient-card shadow-card overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Current Eggs
            </h2>
            
            <EggWithCount count={currentCount} size="lg" />
            
            {previousCount !== undefined && delta !== 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full font-semibold',
                  delta < 0 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-green-500/10 text-green-600'
                )}
              >
                <span>{delta < 0 ? '↓' : '↑'}</span>
                <span>
                  {Math.abs(delta)} {Math.abs(delta) === 1 ? 'egg' : 'eggs'} {delta < 0 ? 'taken' : 'added'}
                </span>
              </motion.div>
            )}
            
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Updated {new Date(lastUpdated).toLocaleString('en-US', { 
                  timeZone: 'America/Sao_Paulo',
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

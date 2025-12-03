import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEggHistory } from '@/hooks/useEggState';
import { DeltaBadge } from '@/components/DeltaBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EggWithCount } from '@/components/EggIcon';
import { Check, ChevronRight } from 'lucide-react';
import type { EggEvent } from '@/types';

const History: React.FC = () => {
  const { data: history, isLoading } = useEggHistory();

  // Group events by boxId
  const groupedHistory = useMemo(() => {
    if (!history) return {};
    
    return history.reduce((acc, event) => {
      if (!acc[event.boxId]) {
        acc[event.boxId] = [];
      }
      acc[event.boxId].push(event);
      return acc;
    }, {} as Record<string, EggEvent[]>);
  }, [history]);

  // Calculate stats per box
  const boxStats = useMemo(() => {
    const stats: Record<string, { totalTaken: number; currentCount: number; userTotals: Record<string, number> }> = {};
    
    Object.entries(groupedHistory).forEach(([boxId, events]) => {
      const userTotals: Record<string, number> = {};
      let totalTaken = 0;
      
      events.forEach((event) => {
        const delta = event.beforeCount - event.afterCount;
        if (delta > 0) {
          totalTaken += delta;
          if (event.confirmedBy) {
            userTotals[event.confirmedBy] = (userTotals[event.confirmedBy] || 0) + delta;
          }
        }
      });

      const latestEvent = events[0];
      stats[boxId] = {
        totalTaken,
        currentCount: latestEvent?.afterCount || 0,
        userTotals,
      };
    });
    
    return stats;
  }, [groupedHistory]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Eggbox History</h1>
        <Card className="gradient-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No history yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eggbox History</h1>

      <Accordion type="multiple" defaultValue={Object.keys(groupedHistory)} className="space-y-4">
        {Object.entries(groupedHistory).map(([boxId, events], index) => {
          const stats = boxStats[boxId];
          
          return (
            <motion.div
              key={boxId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AccordionItem value={boxId} className="border-0">
                <Card className="gradient-card shadow-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-4 w-full">
                      <EggWithCount count={stats.currentCount} size="sm" />
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold">Box #{boxId.slice(0, 8)}</h3>
                        <p className="text-xs text-muted-foreground">
                          {events.length} events · {stats.totalTaken} eggs taken
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* User Stats */}
                      {Object.keys(stats.userTotals).length > 0 && (
                        <div className="p-3 rounded-xl bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Eggs taken by user
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.userTotals).map(([user, count]) => (
                              <span 
                                key={user}
                                className="px-2 py-1 rounded-full bg-primary/20 text-xs font-medium"
                              >
                                {user}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Event List */}
                      <div className="space-y-2">
                        {events.map((event) => (
                          <Link
                            key={event.id}
                            to={`/event/${event.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-muted/50 transition-colors">
                              <DeltaBadge 
                                before={event.beforeCount} 
                                after={event.afterCount}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground truncate">
                                  {new Date(event.timestamp).toLocaleString('en-US', {
                                    timeZone: 'America/Sao_Paulo',
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </p>
                              </div>
                              {event.confirmedBy && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <Check className="w-3 h-3" />
                                  {event.confirmedBy}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </motion.div>
          );
        })}
      </Accordion>
    </div>
  );
};

export default History;

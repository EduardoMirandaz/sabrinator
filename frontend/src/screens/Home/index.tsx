import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrentEggState, useEggHistory } from '@/hooks/useEggState';
import { EggCard } from '@/components/EggCard';
import { ImageComparison } from '@/components/ImageViewer';
import { DeltaBadge } from '@/components/DeltaBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Bell, RefreshCw } from 'lucide-react';
import { subscribeToPush, isPushSupported, getNotificationPermission } from '@/services/push';
import { useToast } from '@/hooks/use-toast';

const Home: React.FC = () => {
  const { data: eggState, isLoading: stateLoading, refetch } = useCurrentEggState();
  const { data: history, isLoading: historyLoading } = useEggHistory();
  const { toast } = useToast();

  const lastEvent = history?.[0];
  const showPushPrompt = isPushSupported() && getNotificationPermission() === 'default';

  const handleEnablePush = async () => {
    const subscription = await subscribeToPush();
    if (subscription) {
      toast({
        title: 'Notifications enabled! 🔔',
        description: "You'll be notified when eggs are taken",
      });
    } else {
      toast({
        title: 'Could not enable notifications',
        description: 'Please check your browser settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Prompt */}
      {showPushPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-accent/50 border-accent">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-secondary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Enable notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get alerts when eggs are taken
                  </p>
                </div>
                <Button variant="egg" size="sm" onClick={handleEnablePush}>
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current State Card */}
      {stateLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : eggState ? (
        <EggCard
          currentCount={eggState.currentCount}
          previousCount={eggState.previousCount}
          lastUpdated={eggState.lastUpdated}
        />
      ) : (
        <Card className="gradient-card">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No egg data available</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Comparison */}
      {eggState && eggState.lastImageUrl && eggState.previousImageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="gradient-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Latest Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageComparison
                beforeSrc={eggState.previousImageUrl}
                afterSrc={eggState.lastImageUrl}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Last Event Card */}
      {historyLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : lastEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="gradient-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Last Event</CardTitle>
                <Link to={`/event/${lastEvent.id}`}>
                  <Button variant="ghost" size="sm">
                    Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <DeltaBadge 
                  before={lastEvent.beforeCount} 
                  after={lastEvent.afterCount} 
                />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastEvent.timestamp).toLocaleString('en-US', {
                      timeZone: 'America/Sao_Paulo',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                  {lastEvent.confirmedBy && (
                    <p className="text-sm font-medium text-green-600">
                      ✓ {lastEvent.confirmedBy}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4"
      >
        <Link to="/history">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-sm">View History</span>
          </Button>
        </Link>
        <Link to="/stats">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
            <span className="text-2xl">📊</span>
            <span className="text-sm">See Stats</span>
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default Home;

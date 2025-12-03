import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEventDetails } from '@/hooks/useEggState';
import { ImageComparison } from '@/components/ImageViewer';
import { DeltaSummary } from '@/components/DeltaBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, Undo2, Clock } from 'lucide-react';

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading } = useEventDetails(eventId || '');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Event not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="-ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Event Images */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImageComparison
              beforeSrc={event.beforeImageUrl}
              afterSrc={event.afterImageUrl}
            />

            <DeltaSummary
              before={event.beforeCount}
              after={event.afterCount}
              confirmedBy={event.confirmedBy}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Event Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="gradient-card shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Detected</p>
                <p className="text-sm font-medium">
                  {new Date(event.timestamp).toLocaleString('en-US', {
                    timeZone: 'America/Sao_Paulo',
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-4 h-4 flex items-center justify-center">
                {event.eggTakerVerified ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">
                  {event.eggTakerVerified ? 'Verified' : 'Pending confirmation'}
                </p>
              </div>
            </div>

            {event.confirmedBy && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confirmed by</p>
                  <p className="text-sm font-medium">{event.confirmedBy}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reversal History */}
      {event.reversalHistory && event.reversalHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Confirmation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {event.reversalHistory.map((entry, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                      entry.action === 'confirmed' 
                        ? 'bg-green-500/10 text-green-600' 
                        : 'bg-secondary/10 text-secondary'
                    }`}>
                      {entry.action === 'confirmed' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Undo2 className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{entry.username}</span>
                        {' '}
                        <span className="text-muted-foreground">
                          {entry.action === 'confirmed' ? 'confirmed taking eggs' : 'reversed their confirmation'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          timeZone: 'America/Sao_Paulo',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Button */}
      {!event.eggTakerVerified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="sunny"
            size="lg"
            className="w-full"
            onClick={() => navigate(`/confirm/${event.id}`)}
          >
            Respond to This Event
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default EventDetails;

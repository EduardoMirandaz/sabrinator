import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEventDetails, useConfirmEgg, useUndoConfirmation, useDenyEggTaking } from '@/hooks/useEggState';
import { useAuth } from '@/context/AuthContext';
import { ImageComparison } from '@/components/ImageViewer';
import { DeltaSummary } from '@/components/DeltaBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, Undo2, Loader2 } from 'lucide-react';

const Confirmation: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: event, isLoading } = useEventDetails(eventId || '');
  const confirmMutation = useConfirmEgg();
  const undoMutation = useUndoConfirmation();
  const denyMutation = useDenyEggTaking();

  const handleConfirm = async () => {
    if (!eventId) return;
    
    try {
      await confirmMutation.mutateAsync(eventId);
      toast({
        title: 'Confirmed! 🥚',
        description: 'Thank you for confirming',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Could not confirm',
        variant: 'destructive',
      });
    }
  };

  const handleDeny = async () => {
    if (!eventId) return;
    
    try {
      await denyMutation.mutateAsync(eventId);
      toast({
        title: 'Got it',
        description: "We'll ask someone else",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Could not deny',
        variant: 'destructive',
      });
    }
  };

  const handleUndo = async () => {
    if (!eventId) return;
    
    try {
      await undoMutation.mutateAsync(eventId);
      toast({
        title: 'Undone',
        description: 'Your confirmation has been reversed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Could not undo',
        variant: 'destructive',
      });
    }
  };

  const isConfirmedByMe = event?.confirmedBy === user?.username;
  const isConfirmedByOther = event?.confirmedBy && !isConfirmedByMe;
  const canConfirm = !event?.eggTakerVerified;
  const isPending = confirmMutation.isPending || undoMutation.isPending || denyMutation.isPending;

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Egg Event Detected</CardTitle>
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

            <p className="text-sm text-muted-foreground">
              Detected at{' '}
              {new Date(event.timestamp).toLocaleString('en-US', {
                timeZone: 'America/Sao_Paulo',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {isConfirmedByOther ? (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-600">
                Already confirmed by {event.confirmedBy}
              </p>
            </CardContent>
          </Card>
        ) : isConfirmedByMe ? (
          <>
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-600">
                  You confirmed this event
                </p>
              </CardContent>
            </Card>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleUndo}
              disabled={isPending}
            >
              {undoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Undo2 className="w-4 h-4 mr-2" />
              )}
              Undo My Confirmation
            </Button>
          </>
        ) : canConfirm ? (
          <>
            <Button
              variant="confirm"
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Yes, I Took Them
            </Button>
            <Button
              variant="deny"
              size="lg"
              className="w-full"
              onClick={handleDeny}
              disabled={isPending}
            >
              {denyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              No, It Wasn't Me
            </Button>
          </>
        ) : null}
      </motion.div>

      {/* Reversal History */}
      {event.reversalHistory && event.reversalHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {event.reversalHistory.map((entry, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className={entry.action === 'confirmed' ? 'text-green-600' : 'text-secondary'}>
                      {entry.action === 'confirmed' ? '✓' : '↩'}
                    </span>
                    <span className="font-medium">{entry.username}</span>
                    <span className="text-muted-foreground">
                      {entry.action} at{' '}
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                        timeZone: 'America/Sao_Paulo',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Confirmation;

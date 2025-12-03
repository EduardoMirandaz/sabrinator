import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGenerateInvite,
  adminGetUsers,
  adminDeleteUser,
  adminResetBox,
  adminGetInvites,
  adminRevokeInvite,
} from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Link as LinkIcon, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Loader2,
  Plus,
  Shield 
} from 'lucide-react';
import type { User, InviteLink } from '@/types';

const Admin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminGetUsers,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['adminInvites'],
    queryFn: adminGetInvites,
  });

  const generateInviteMutation = useMutation({
    mutationFn: adminGenerateInvite,
    onSuccess: (invite) => {
      // Optimistically add invite to list since backend list isn't implemented
      queryClient.setQueryData<InviteLink[] | undefined>(['adminInvites'], (prev) => {
        const list = prev ?? [];
        // avoid duplicates by token
        if (list.some(i => i.token === invite.token)) return list;
        return [invite, ...list];
      });
      toast({
        title: 'Invite generated! 🎉',
        description: 'The link is ready to share',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not generate invite',
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({
        title: 'User deleted',
        description: 'The user has been removed',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not delete user',
        variant: 'destructive',
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: adminRevokeInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvites'] });
      toast({
        title: 'Invite revoked',
        description: 'The invite link is no longer valid',
      });
    },
  });

  const resetBoxMutation = useMutation({
    mutationFn: adminResetBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eggState'] });
      queryClient.invalidateQueries({ queryKey: ['eggHistory'] });
      toast({
        title: 'Box reset',
        description: 'A new eggbox has been started',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not reset box',
        variant: 'destructive',
      });
    },
  });

  const copyInviteLink = (invite: InviteLink) => {
    const link = `${window.location.origin}/register?token=${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedInvite(invite.id);
    setTimeout(() => setCopiedInvite(null), 2000);
    toast({
      title: 'Copied!',
      description: 'Invite link copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-secondary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Generate Invite */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Invite Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="sunny"
              className="w-full"
              onClick={() => generateInviteMutation.mutate()}
              disabled={generateInviteMutation.isPending}
            >
              {generateInviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Generate New Invite
            </Button>

            {invitesLoading ? (
              <Skeleton className="h-20" />
            ) : invites && invites.length > 0 ? (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-2 p-3 rounded-xl bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate">{invite.token}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteLink(invite)}
                    >
                      {copiedInvite === invite.id ? (
                        <span className="text-green-600 text-xs">Copied!</span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active invites
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Manage Users ({users?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-24" />
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {u.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                    </div>
                    {u.role !== 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {u.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this user. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUserMutation.mutate(u.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users yet
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reset Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="gradient-card shadow-card border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <RefreshCw className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Reset Eggbox
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset the eggbox?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will start a new eggbox tracking session. Previous history will be preserved but a new box ID will be assigned.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetBoxMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {resetBoxMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Reset Box
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Admin;

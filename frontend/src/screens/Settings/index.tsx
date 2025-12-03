import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { updateUsername } from '@/services/api';
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  isPushSupported, 
  getNotificationPermission,
  getCurrentPushSubscription 
} from '@/services/push';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, LogOut, Loader2, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [username, setUsername] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isCheckingPush, setIsCheckingPush] = useState(true);

  useEffect(() => {
    const checkPushStatus = async () => {
      if (isPushSupported()) {
        const subscription = await getCurrentPushSubscription();
        setPushEnabled(!!subscription);
      }
      setIsCheckingPush(false);
    };
    checkPushStatus();
  }, []);

  const handleSaveUsername = async () => {
    if (!username.trim() || username.trim().length < 3) {
      toast({
        title: 'Invalid username',
        description: 'Username must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await updateUsername(username.trim());
      updateUser(updatedUser);
      toast({
        title: 'Username updated',
        description: 'Your username has been changed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Could not update username',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const subscription = await subscribeToPush();
      if (subscription) {
        setPushEnabled(true);
        toast({
          title: 'Notifications enabled',
          description: "You'll receive push notifications",
        });
      } else {
        toast({
          title: 'Could not enable notifications',
          description: 'Please check your browser settings',
          variant: 'destructive',
        });
      }
    } else {
      const success = await unsubscribeFromPush();
      if (success) {
        setPushEnabled(false);
        toast({
          title: 'Notifications disabled',
          description: "You won't receive push notifications",
        });
      }
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'See you next time! 🥚',
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="flex-1"
                />
                <Button
                  variant="egg"
                  onClick={handleSaveUsername}
                  disabled={isSaving || username === user?.username}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Role: <span className="font-medium capitalize">{user?.role}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPushSupported() ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when eggs are taken
                  </p>
                </div>
                {isCheckingPush ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handlePushToggle}
                    disabled={getNotificationPermission() === 'denied'}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported on this device
              </p>
            )}
            
            {getNotificationPermission() === 'denied' && (
              <p className="text-xs text-destructive mt-2">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;

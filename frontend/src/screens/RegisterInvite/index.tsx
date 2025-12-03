import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { validateInviteToken } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EggIcon } from '@/components/EggIcon';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const RegisterInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') || '';
  
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  
  const { register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const validateToken = async () => {
      if (!inviteToken) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const result = await validateInviteToken(inviteToken);
        setIsValid(result.valid);
        setExpiresAt(result.expiresAt);
      } catch {
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: 'Username required',
        description: 'Please choose a username',
        variant: 'destructive',
      });
      return;
    }

    if (username.trim().length < 3) {
      toast({
        title: 'Username too short',
        description: 'Username must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim() || !phone.trim() || !password.trim()) {
      toast({ title: 'All fields required', description: 'Fill name, phone and password', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await register(inviteToken, username.trim(), name.trim(), phone.trim(), password.trim());
      toast({
        title: 'Welcome to Eggs Regaco! 🥚',
        description: 'Your account has been created',
      });
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'Could not create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!inviteToken || !isValid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-card border-0">
          <CardContent className="pt-8 text-center space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Invalid Invite Link</h2>
            <p className="text-muted-foreground">
              This invite link is invalid or has expired. Please ask for a new invite.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <Card className="shadow-card border-0">
        <CardHeader className="text-center space-y-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex justify-center"
          >
            <EggIcon size={64} />
          </motion.div>
          <div>
            <CardTitle className="text-2xl font-bold">
              You're Invited! 🎉
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Join Eggs Regaco and start tracking
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-600 mb-6">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Valid invite</span>
            {expiresAt && (
              <span className="text-xs opacity-75 ml-auto">
                Expires {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Choose a Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
                autoComplete="username"
                minLength={3}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, this will identify you in the app
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input id="name" type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+55 11 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" autoComplete="new-password" />
            </div>

            <Button 
              type="submit" 
              variant="sunny" 
              size="lg" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Join Eggs Regaco'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-secondary font-medium hover:underline"
            >
              Login here
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RegisterInvite;

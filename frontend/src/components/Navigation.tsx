import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, History, BarChart3, Bell, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { EggIcon } from './EggIcon';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/stats', icon: BarChart3, label: 'Stats' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { path: '/admin', icon: Shield, label: 'Admin' },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Ensure admins also see the Settings tab; append Admin tab
  const items = user?.role === 'admin'
    ? [...navItems, ...adminItems]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                isActive 
                  ? 'text-secondary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 bg-primary rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export const Header: React.FC<{ title?: string; showLogo?: boolean }> = ({ 
  title, 
  showLogo = true 
}) => {
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {showLogo && (
          <Link to="/" className="flex items-center gap-2">
            <EggIcon size={28} animated />
            <span className="font-bold text-lg text-foreground">
              Eggs Regaco
            </span>
          </Link>
        )}
        {title && !showLogo && (
          <h1 className="font-bold text-lg text-foreground">{title}</h1>
        )}
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
};

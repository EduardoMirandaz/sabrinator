import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout, AuthLayout, AdminGuard } from "@/components/Layout";
import { useEffect } from "react";

// Screens
import Login from "@/screens/Login";
import RegisterInvite from "@/screens/RegisterInvite";
import Home from "@/screens/Home";
import Confirmation from "@/screens/Confirmation";
import History from "@/screens/History";
import Stats from "@/screens/Stats";
import Notifications from "@/screens/Notifications";
import Settings from "@/screens/Settings";
import Admin from "@/screens/Admin";
import EventDetails from "@/screens/EventDetails";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// Register service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

const App = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterInvite />} />
              </Route>

              {/* App Routes */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/confirm/:eventId" element={<Confirmation />} />
                <Route path="/event/:eventId" element={<EventDetails />} />
                <Route path="/history" element={<History />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/admin"
                  element={
                    <AdminGuard>
                      <Admin />
                    </AdminGuard>
                  }
                />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

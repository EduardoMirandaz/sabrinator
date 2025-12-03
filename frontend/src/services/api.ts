import axios from 'axios';
import type { 
  User, 
  EggState, 
  EggEvent, 
  Notification, 
  EggStats, 
  InviteLink,
  PushSubscriptionData 
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5473';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const registerInvite = async (
  inviteToken: string,
  username: string,
  name: string,
  phone: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const response = await api.post('/auth/register', {
    invite_token: inviteToken,
    username,
    name,
    phone,
    password,
  });
  // After register, auto-login flow
  const loginRes = await api.post('/auth/login', { username, password });
  const accessToken: string | undefined = loginRes.data?.access_token;
  if (!accessToken) throw new Error(loginRes.data?.error || 'login_failed');
  localStorage.setItem('auth_token', accessToken);
  const me = await api.get('/auth/me');
  return { user: me.data, token: accessToken };
};

export const login = async (username: string, password: string): Promise<{ user: User; token: string }> => {
  const response = await api.post('/auth/login', { username, password });
  // Backend returns { access_token }
  const accessToken: string | undefined = response.data?.access_token;
  if (!accessToken) {
    // propagate backend error as-is
    throw new Error(response.data?.error || 'login_failed');
  }
  // Temporarily store token to call /auth/me
  localStorage.setItem('auth_token', accessToken);
  const me = await api.get('/auth/me');
  const user = me.data;
  return { user, token: accessToken };
};

export const validateInviteToken = async (token: string): Promise<{ valid: boolean; expiresAt: string }> => {
  const response = await api.get(`/auth/validate-invite/${token}`);
  return response.data;
};

// Push notification endpoints
export const registerPushSubscription = async (subscription: PushSubscriptionData): Promise<void> => {
  await api.post('/notifications/register-push-subscription', subscription);
};

export const unregisterPushSubscription = async (endpoint: string): Promise<void> => {
  await api.delete('/notifications/unregister-push-subscription', { data: { endpoint } });
};

// Egg state endpoints
export const getCurrentState = async (): Promise<EggState> => {
  const response = await api.get('/eggs/current');
  return response.data;
};

export const getEggHistory = async (boxId?: string): Promise<EggEvent[]> => {
  const response = await api.get('/eggs/history', { params: { boxId } });
  return response.data;
};

export const getEventDetails = async (eventId: string): Promise<EggEvent> => {
  const response = await api.get(`/eggs/events/${eventId}`);
  return response.data;
};

// Confirmation endpoints
export const postEggConfirmation = async (eventId: string): Promise<EggEvent> => {
  const response = await api.post(`/eggs/events/${eventId}/confirm`);
  return response.data;
};

export const undoEggConfirmation = async (eventId: string): Promise<EggEvent> => {
  const response = await api.post(`/eggs/events/${eventId}/undo`);
  return response.data;
};

export const denyEggTaking = async (eventId: string): Promise<void> => {
  await api.post(`/eggs/events/${eventId}/deny`);
};

// Notification endpoints
export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await api.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

// Stats endpoints
export const getStats = async (): Promise<EggStats> => {
  const response = await api.get('/stats');
  return response.data;
};

// Admin endpoints
export const adminGenerateInvite = async (): Promise<InviteLink> => {
  // Backend endpoint is /admin/invite/create and returns { token, expires_at, used, max_uses, uses }
  const response = await api.post('/admin/invite/create', { max_uses: 1, expires_hours: 24 });
  const inv = response.data;
  // Normalize fields for frontend types
  const normalized: InviteLink = {
    id: inv.token,
    token: inv.token,
    createdAt: inv.expires_at || new Date().toISOString(),
    expiresAt: inv.expires_at,
    usedBy: inv.used ? 'unknown' : null,
  };
  return normalized;
};

export const adminGetUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const adminDeleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

export const adminResetBox = async (): Promise<void> => {
  await api.post('/admin/reset-box');
};

export const adminGetInvites = async (): Promise<InviteLink[]> => {
  const response = await api.get('/admin/invites');
  const invites = response.data as any[];
  return invites.map((inv) => ({
    id: inv.token,
    token: inv.token,
    createdAt: inv.expires_at || new Date().toISOString(),
    expiresAt: inv.expires_at,
    usedBy: inv.used ? 'unknown' : null,
  }));
};

export const adminRevokeInvite = async (inviteId: string): Promise<void> => {
  await api.delete(`/admin/invites/${inviteId}`);
};

// Settings endpoints
export const updateUsername = async (newUsername: string): Promise<User> => {
  const response = await api.patch('/users/me', { username: newUsername });
  return response.data;
};

export default api;

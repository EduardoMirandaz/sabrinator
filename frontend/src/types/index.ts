export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface EggState {
  boxId: string;
  currentCount: number;
  previousCount: number;
  lastUpdated: string;
  lastImageUrl: string;
  previousImageUrl: string;
}

export interface EggEvent {
  id: string;
  boxId: string;
  beforeCount: number;
  afterCount: number;
  delta: number;
  beforeImageUrl: string;
  afterImageUrl: string;
  timestamp: string;
  confirmedBy: string | null;
  eggTakerVerified: boolean;
  reversalHistory: ReversalEntry[];
}

export interface ReversalEntry {
  userId: string;
  username: string;
  action: 'confirmed' | 'reversed';
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'delta_detected' | 'user_confirmed' | 'user_reversed' | 'reminder';
  title: string;
  message: string;
  eventId: string | null;
  read: boolean;
  timestamp: string;
}

export interface EggStats {
  eggsPerUser: { username: string; count: number }[];
  eggsPerDay: { date: string; count: number }[];
  eggsPerWeek: { week: string; count: number }[];
  eggsPerMonth: { month: string; count: number }[];
  totalConsumed: number;
  prediction?: { nextWeek: number };
}

export interface InviteLink {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedBy: string | null;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

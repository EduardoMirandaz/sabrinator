import { registerPushSubscription, unregisterPushSubscription } from './api';
import type { PushSubscriptionData } from '@/types';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }
  return await Notification.requestPermission();
};

export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    // Get keys safely
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    
    if (!p256dhKey || !authKey) {
      throw new Error('Failed to get subscription keys');
    }

    // Send subscription to backend
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
        auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
      },
    };

    await registerPushSubscription(subscriptionData);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await unregisterPushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
};

export const getCurrentPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
};

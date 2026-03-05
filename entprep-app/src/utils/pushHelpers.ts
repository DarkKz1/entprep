import { supabase } from '../config/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Check if push is supported in this browser */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** Get current permission state */
export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/** Check if currently subscribed */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Subscribe to push notifications, save subscription to Supabase */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY || !supabase) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    await saveSubscription(subscription);
    return true;
  } catch {
    return false;
  }
}

/** Unsubscribe from push */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await deleteSubscription(endpoint);
    }
  } catch {
    // Silent fail
  }
}

// ── Server communication ─────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const headers = await getAuthHeaders();
  if (!headers) return;
  try {
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }),
    });
  } catch {
    console.error('Failed to save push subscription to server');
  }
}

async function deleteSubscription(endpoint: string): Promise<void> {
  const headers = await getAuthHeaders();
  if (!headers) return;
  try {
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'unsubscribe', endpoint }),
    });
  } catch {
    console.error('Failed to delete push subscription from server');
  }
}

/** Sync per-type preferences to server (fire-and-forget) */
export function syncPushPrefs(prefs: { streak?: boolean; errors?: boolean; weekly?: boolean }): void {
  getAuthHeaders().then((headers) => {
    if (!headers) return;
    fetch('/api/push-subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'update_prefs', prefs }),
    }).catch(() => { /* silent */ });
  });
}

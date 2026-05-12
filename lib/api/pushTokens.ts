import { api } from '../api';

export async function registerPushToken(input: {
  token: string;
  platform?: 'ios' | 'android' | 'web';
  device_id?: string;
}): Promise<void> {
  await api('/api/me/push-token', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api(`/api/me/push-token?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
}

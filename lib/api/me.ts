import { api } from '../api';
import type { MyCheckIn } from '../types';

export async function fetchMyCheckIns(limit = 50): Promise<MyCheckIn[]> {
  const data = await api<{ check_ins: MyCheckIn[] }>(
    `/api/me/check-ins?limit=${limit}`,
  );
  return data.check_ins;
}

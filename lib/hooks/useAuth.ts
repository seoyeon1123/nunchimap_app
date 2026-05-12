import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, loginAsDev, loginWithKakao, logout, MeUser } from '../auth';
import { KAKAO_REST_API_KEY } from '../config';
import { clearPushRegistration, ensurePushRegistered } from '../push';

const ME_KEY = ['me'] as const;

export function useMe() {
  const query = useQuery<MeUser | null>({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
  });

  // 로그인된 사용자에 한해 푸시 토큰 등록 — 권한 거부돼도 조용히 실패
  const isLoggedIn = !!query.data;
  useEffect(() => {
    if (!isLoggedIn) return;
    ensurePushRegistered().catch(() => {
      // 푸시는 부가 기능 — 실패해도 무시
    });
  }, [isLoggedIn]);

  return query;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!KAKAO_REST_API_KEY) {
        throw new Error('카카오 REST API 키가 .env.local 에 없습니다.');
      }
      return loginWithKakao(KAKAO_REST_API_KEY);
    },
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user);
    },
  });
}

export function useDevLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loginAsDev,
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // 푸시 토큰을 서버에서 먼저 제거 (실패해도 로그아웃은 진행)
      await clearPushRegistration().catch(() => {});
      await logout();
    },
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null);
      qc.removeQueries({ queryKey: ['active-checkin'] });
      qc.removeQueries({ queryKey: ['my-checkins'] });
      qc.removeQueries({ queryKey: ['favorites'] });
    },
  });
}

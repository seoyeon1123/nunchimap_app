import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, loginWithKakao, logout, MeUser } from '../auth';
import { KAKAO_REST_API_KEY } from '../config';

const ME_KEY = ['me'] as const;

export function useMe() {
  return useQuery<MeUser | null>({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
  });
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

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null);
    },
  });
}

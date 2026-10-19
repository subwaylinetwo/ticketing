'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { api, type MyState } from './api';

export type Active = Extract<MyState, { status: 'active' | 'pending' | 'hidden' }>;
type Need = 'active' | 'pending' | 'hidden' | 'profile' | 'none';

// 로그인/가입 상태에 맞는 첫 화면
export function homeFor(state: MyState | null): string {
  if (!state) return '/start';
  if (state.status === 'no_profile') return '/ticket';
  if (state.status === 'pending') return '/pending';
  if (state.status === 'hidden') return '/hidden';
  return '/browse';
}

// 화면마다 "이 상태여야 들어올 수 있다"를 걸어 두고, 아니면 맞는 화면으로 보낸다
export function useMe(need: Need) {
  const router = useRouter();
  const [me, setMe] = useState<Active | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { if (need !== 'none') router.replace('/start'); setReady(true); return null; }
    const st = await api.myState();
    const ok =
      need === 'none' ||
      (need === 'profile' && st.status === 'no_profile') ||
      (need === 'active' && st.status === 'active') ||
      (need === 'pending' && st.status === 'pending') ||
      (need === 'hidden' && st.status === 'hidden');
    if (!ok) { router.replace(homeFor(st)); return null; }
    if (st.status !== 'no_profile') setMe(st);
    setReady(true);
    return st;
  }, [need, router]);

  useEffect(() => { refresh(); }, [refresh]);
  return { me, setMe, ready, refresh };
}

export function usePhotoUrls(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const list = key ? key.split('|') : [];
    const missing = list.filter((p) => !urls[p]);
    if (!missing.length) return;
    supabase.storage.from('photos').createSignedUrls(missing, 3600).then(({ data }) => {
      if (!data) return;
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl])) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

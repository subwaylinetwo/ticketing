'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { homeFor } from '@/lib/useMe';
import { Loading } from '@/components/ui';

// 첫 진입: 상태를 보고 맞는 화면으로 보낸다
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/start');
      try { router.replace(homeFor(await api.myState())); } catch { router.replace('/start'); }
    })();
  }, [router]);
  return <Loading />;
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/lib/useMe';
import { BOOTH } from '@/lib/config';
import { C, Card, FootBar, Icon, InkButton, Loading, Row, Screen, Tile, TILE } from '@/components/ui';

export default function Hidden() {
  const router = useRouter();
  const { me, refresh } = useMe('hidden');
  useEffect(() => { const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);   // 풀리면 자동으로 둘러보기로
  if (!me) return <Loading />;
  return (
    <Screen bg={C.bg}>
      <div style={{ paddingTop: 'max(80px, 14dvh)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, background: '#FFFFFF', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 10px 24px -10px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 'max(80px, 14dvh)' }}>
          <Icon name="eye-off" size={40} color={C.sub} stroke={1.8} /></div>
        <h1 style={{ margin: '24px 0 0', fontSize: 28, lineHeight: 1.3, fontWeight: 700, letterSpacing: '-0.025em' }}>지금은 내 티켓이<br />보이지 않아요</h1>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.55, color: C.ink2 }}>신고가 들어와서 운영진이 확인하고 있어요.<br />확인하는 동안 둘러보기와 하트 보내기를 쉬어요.</p>
      </div>
      <Card style={{ marginTop: 32 }}>
        <Row><Tile icon="clock" bg={TILE.grey} /><span style={{ flex: 1, fontSize: 16 }}>운영진이 확인하면 결과가 바로 반영돼요</span></Row>
        <Row last><Tile icon="check" bg={TILE.green} /><span style={{ flex: 1, fontSize: 16 }}>문제가 없으면 하트와 매칭이 그대로 돌아와요</span></Row>
      </Card>
      <p style={{ margin: '16px 20px 0', fontSize: 13, lineHeight: 1.45, color: C.sub, textAlign: 'center' }}>착오인 것 같으면 부스로 와 주세요({BOOTH.location}). 학생증을 보여 주면 바로 확인해 드려요.</p>
      <FootBar>
        <InkButton onClick={() => refresh()}>다시 확인하기</InkButton>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/start'); }} style={{ width: '100%', height: 44, marginTop: 4, border: 0, background: 'none', fontSize: 15, color: C.sub, cursor: 'pointer' }}>로그아웃</button>
      </FootBar>
    </Screen>
  );
}

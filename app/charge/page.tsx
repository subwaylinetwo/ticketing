'use client';
// 하트 충전: 개수 고르기 → 입금 안내 → 확인되면 자동 충전
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { BOOTH, HEART_PRICE, PACKS } from '@/lib/config';
import { Account } from '@/components/Account';
import { C, ErrorText, FootBar, Heart, InkButton, Label, Loading, Note, OrangeButton, Screen, Spinner, Title, TopBar } from '@/components/ui';

export default function Charge() {
  const router = useRouter();
  const { me, setMe, refresh } = useMe('active');
  const [pick, setPick] = useState<(typeof PACKS)[number]>(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(0);
  const before = useRef<number | null>(null);
  const pending = me?.pending_payment?.kind === 'hearts' ? me.pending_payment : null;

  // 대기 중이면 4초마다 확인
  useEffect(() => {
    if (!pending) return;
    if (before.current === null) before.current = me!.hearts;
    const t = setInterval(async () => {
      const st = await refresh();
      if (st && st.status === 'active' && !st.pending_payment && before.current !== null && st.hearts > before.current) {
        setDone(st.hearts - before.current); before.current = null;
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pending, refresh, me]);

  if (!me) return <Loading />;

  async function request() {
    setBusy(true); setErr('');
    try { const st = await api.requestHearts(pick); if (st.status !== 'no_profile') { before.current = me!.hearts; setMe(st); } }
    catch (e) { setErr(e instanceof ApiError ? e.message : '신청하지 못했어요.'); }
    setBusy(false);
  }
  async function cancel() {
    setBusy(true);
    try { const st = await api.cancelHearts(); if (st.status !== 'no_profile') setMe(st); before.current = null; } catch {}
    setBusy(false);
  }

  if (done) return (
    <Screen>
      <div style={{ padding: '120px 24px 0', textAlign: 'center' }}>
        <div className="pop" style={{ width: 96, height: 96, borderRadius: 48, margin: '0 auto', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 40px -12px rgba(236,74,18,0.7)' }}>
          <Heart size={46} color="#FFFFFF" /></div>
        <h1 style={{ margin: '28px 0 0', fontSize: 28, fontWeight: 700 }}>하트 {done}개가 들어왔어요</h1>
        <p style={{ margin: '8px 0 0', fontSize: 16, color: C.ink2 }}>지금 하트 <b className="tnum">{me.hearts}</b>개</p>
      </div>
      <FootBar><OrangeButton onClick={() => router.push('/browse')}>둘러보러 가기</OrangeButton></FootBar>
    </Screen>
  );

  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back="/browse" label="둘러보기" />
        <Title sub={<>지금 하트 <b className="tnum">{me.hearts}</b>개 · 1개에 {HEART_PRICE.toLocaleString()}원</>}>{me.hearts ? '하트 충전' : '하트를 다 썼어요'}</Title>
      </div>

      {me.received_open > 0 && !pending && (
        <div style={{ margin: '20px 16px 0', ...C.card, height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={16} color="#FFFFFF" /></span>
          <span style={{ fontSize: 16 }}>{me.received_open}명이 아직 내 하트를 기다려요</span>
        </div>
      )}

      {pending ? <>
        <Label style={{ marginTop: 24 }}>하트 {pending.hearts}개 · 입금을 기다리는 중</Label>
        <Account amount={pending.amount} tag={me.depositor_tag} />
        <Note>부스에서 현금으로 내도 돼요 · {BOOTH.location}</Note>
        <div style={{ margin: '28px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15, color: C.ink2 }}><Spinner size={16} />확인되면 바로 충전돼요</div>
        <FootBar><InkButton onClick={cancel} busy={busy} style={{ background: '#FFFFFF', color: C.ink, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)' }}>다른 개수로 바꾸기</InkButton></FootBar>
      </> : <>
        <Label style={{ marginTop: 24 }}>몇 개 충전할까요?</Label>
        <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {PACKS.map((n) => (
            <button key={n} aria-pressed={pick === n} onClick={() => setPick(n)} style={{ height: 88, borderRadius: 18, border: 0, background: '#FFFFFF', cursor: 'pointer',
              boxShadow: pick === n ? `inset 0 0 0 2px ${C.ink}` : '0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="tnum" style={{ fontSize: 26, fontWeight: 700 }}>{n}<span style={{ fontSize: 14, fontWeight: 600 }}>개</span></span>
              <span className="tnum" style={{ fontSize: 13, color: C.sub }}>{(n * HEART_PRICE).toLocaleString()}원</span>
            </button>))}
        </div>
        <Note>신청하면 입금 계좌가 나와요. 입금자명에 전화번호 뒷자리 <b className="tnum">{me.depositor_tag}</b>를 꼭 붙여 주세요.</Note>
        <ErrorText>{err}</ErrorText>
        <FootBar><OrangeButton onClick={request} busy={busy}>하트 {pick}개 충전하기, {(pick * HEART_PRICE).toLocaleString()}원</OrangeButton></FootBar>
      </>}
    </Screen>
  );
}

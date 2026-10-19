'use client';
// 하트 목록: 보낸 하트(매칭된 사람이 맨 위) / 받은 하트(바로 하트 보내면 매칭)
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError, type HeartPerson } from '@/lib/api';
import { useMe, usePhotoUrls } from '@/lib/useMe';
import { MatchOverlay, type Partner } from '@/components/MatchOverlay';
import { ProfileSheet } from '@/components/ProfileSheet';
import { Avatar, C, ContactLine, copyText, Heart, Icon, Label, Loading, Note, SchoolText, Spinner, TopBar } from '@/components/ui';

export default function HeartsPage() {
  return <Suspense fallback={<Loading />}><Hearts /></Suspense>;
}

function Hearts() {
  const sp = useSearchParams();
  const { me, setMe } = useMe('active');
  const [tab, setTab] = useState<'sent' | 'recv'>(sp.get('tab') === 'recv' ? 'recv' : 'sent');
  const [data, setData] = useState<{ sent: HeartPerson[]; received: HeartPerson[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => api.myHearts().then(setData).catch(() => {}), []);
  useEffect(() => { if (me) load(); }, [me?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const urls = usePhotoUrls([...(data?.sent ?? []), ...(data?.received ?? [])].map((p) => p.photo));
  if (!me || !data) return <Loading />;

  const matched = data.sent.filter((p) => p.matched);
  const waiting = data.sent.filter((p) => !p.matched);
  const open = data.received.filter((p) => !p.matched).length;

  async function sendBack(p: HeartPerson) {
    if (!me) return;
    setBusyId(p.id); setErr('');
    try {
      const r = await api.sendHeart(p.id);
      setMe({ ...me, hearts: r.hearts, received_open: Math.max(0, me.received_open - 1) });
      if (r.partner) setPartner(r.partner);
      await load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : '하트를 보내지 못했어요.'); }
    setBusyId(null);
  }

  const row = (p: HeartPerson, i: number, n: number, right: React.ReactNode, sub: React.ReactNode) => (
    <div key={p.id} style={{ minHeight: 76, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px 12px 0', borderBottom: i < n - 1 ? C.sep : 0 }}>
      <button onClick={() => setView(p.id)} aria-label={`${p.nickname} 님 프로필 보기`} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
        <Avatar url={urls[p.photo]} name={p.nickname} ring={p.matched} dot={p.matched && tab === 'sent' && i === 0} /></button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nickname}</span><SchoolText school={p.school} /></div>
        {sub}
      </div>
      {right}
    </div>
  );
  const copyBtn = (p: HeartPerson) => (
    <button aria-label={`${p.nickname} 님 연락처 복사`} onClick={() => copyText(p.contact_type === 'instagram' ? '@' + p.contact : p.contact ?? '')}
      style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
      <Icon name="copy" size={18} stroke={1.8} /></button>
  );
  const box: React.CSSProperties = { margin: '0 16px', ...C.card, paddingLeft: 14 };

  return (
    <div className="screen" style={{ background: C.glow, paddingBottom: 'calc(60px + var(--safe-b))' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back="/browse" label="둘러보기" right={
          <Link href="/charge" aria-label={`남은 하트 ${me.hearts}개, 충전하기`} style={{ height: 32, padding: '0 12px 0 10px', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontSize: 15, fontWeight: 700 }}><Heart size={15} /><span className="tnum">{me.hearts}</span></Link>} />
        <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em' }}>하트</h1>
      </div>
      <div role="group" aria-label="하트 목록 종류" style={{ margin: '16px 16px 0', padding: 2, borderRadius: 11, background: 'rgba(118,118,128,0.12)', display: 'flex', gap: 2 }}>
        {([['sent', '보낸 하트', data.sent.length], ['recv', '받은 하트', open]] as const).map(([k, label, n]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} style={{ flex: 1, height: 36, border: 0, borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            ...(tab === k ? { background: '#FFFFFF', color: C.ink, boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' } : { background: 'transparent', color: C.ink2 }) }}>
            {label}<span className="tnum" style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...(k === 'recv' && n > 0 ? { background: C.accent, color: '#FFFFFF' } : { background: 'rgba(118,118,128,0.16)', color: C.ink2 }) }}>{n}</span>
          </button>))}
      </div>
      {err && <Note style={{ color: C.red, fontWeight: 600 }}>{err}</Note>}

      {tab === 'sent' ? <>
        {matched.length > 0 && <>
          <Label><Heart size={13} />매칭됐어요 · {matched.length}</Label>
          <div style={box}>{matched.map((p, i) => row(p, i, matched.length, copyBtn(p), <ContactLine type={p.contact_type} contact={p.contact} />))}</div>
          <Note>오늘 행사장에서 바로 연락해 보세요.</Note>
        </>}
        <Label style={{ marginTop: matched.length ? 24 : 20 }}>답을 기다리는 중 · {waiting.length}</Label>
        {waiting.length ? <div style={box}>{waiting.map((p, i) => row(p, i, waiting.length, null,
          <div className="tnum" style={{ marginTop: 3, fontSize: 14, color: C.sub }}>{time(p.sent_at)}에 하트 보냄</div>))}</div>
          : <Note>아직 보낸 하트가 없어요. 둘러보기에서 티켓을 뜯어 보세요.</Note>}
        {waiting.length > 0 && <Note>상대도 하트를 보내면 연락처가 열리고 맨 위로 올라와요.</Note>}
      </> : <>
        <Label>나에게 하트를 보낸 사람 · {data.received.length}</Label>
        {data.received.length ? <div style={box}>{data.received.map((p, i) => row(p, i, data.received.length,
          p.matched ? copyBtn(p) : me.hearts > 0
            ? <button onClick={() => sendBack(p)} disabled={busyId === p.id} aria-label={`${p.nickname} 님에게 하트 보내기`}
                style={{ height: 40, padding: '0 14px 0 12px', border: 0, borderRadius: 20, background: C.orange, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px -8px rgba(236,74,18,0.9)',
                  color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {busyId === p.id ? <Spinner light size={14} /> : <><Heart size={15} color="#FFFFFF" />보내기</>}</button>
            : <Link href="/charge" style={{ height: 40, padding: '0 14px', borderRadius: 20, background: C.bg, display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>하트 충전</Link>,
          p.matched ? <ContactLine type={p.contact_type} contact={p.contact} />
            : <div style={{ marginTop: 3, fontSize: 14, color: C.sub }}>{p.common ? `나와 통하는 점 ${p.common}개` : '하트를 보냈어요'}</div>))}</div>
          : <Note>아직 받은 하트가 없어요.</Note>}
        {data.received.length > 0 && <Note>하트를 보내면 바로 매칭되고 서로의 연락처가 열려요.</Note>}
      </>}

      <p style={{ margin: '40px 20px 0', fontSize: 13, lineHeight: 1.45, color: C.sub, textAlign: 'center' }}>불편한 일이 있으면 부스 운영진에게 바로 알려 주세요.</p>
      {view && <ProfileSheet id={view} onClose={() => setView(null)} />}
      {partner && <MatchOverlay me={{ nickname: me.nickname, school: me.school, photo: me.photos[0] }} partner={partner} onClose={() => setPartner(null)} />}
    </div>
  );
}

function time(s?: string) {
  return s ? new Date(s).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
}

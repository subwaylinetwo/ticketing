'use client';
// 가입비 결제 대기. 4초마다 확인해서 승인되면 둘러보기로.
// ?help=1 이면 '입금이 아직 확인되지 않았어요' 화면
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { BOOTH } from '@/lib/config';
import { Account } from '@/components/Account';
import { C, Card, ErrorText, FootBar, Icon, Label, Loading, Note, Screen, SchoolLogo, Spinner, Tile, TILE, Title, TopBar } from '@/components/ui';

export default function PendingPage() {
  return <Suspense fallback={<Loading />}><Pending /></Suspense>;
}

function Pending() {
  const router = useRouter();
  const help = useSearchParams().get('help') === '1';
  const { me, refresh } = useMe('pending');

  useEffect(() => {
    const t = setInterval(() => { refresh(); }, 4000);   // 승인되면 useMe가 알아서 /browse 로 보냄
    return () => clearInterval(t);
  }, [refresh]);

  if (!me) return <Loading />;
  const pay = me.pending_payment;
  if (help) return <Help amount={pay?.amount ?? 2000} tag={me.depositor_tag ?? ""} left={pay?.find_attempts_left ?? 0} onDone={() => router.replace('/browse')} />;

  return (
    <Screen bg={C.bg}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ height: 44 }} />
        <Title sub={<>가입비 {(pay?.amount ?? 2000).toLocaleString()}원이 확인되면 바로 둘러볼 수 있어요.</>}>거의 다 됐어요</Title>
      </div>
      <div style={{ margin: '20px 16px 0', height: 116, borderRadius: 22, background: 'linear-gradient(180deg, #2C2C2F 0%, #1C1C1E 100%)', color: '#FFFFFF', display: 'flex', position: 'relative',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 14px 28px -14px rgba(0,0,0,0.45)' }}>
        <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
          <span style={{ height: 26, width: 'max-content', padding: '0 10px 0 4px', borderRadius: 13, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <SchoolLogo school={me.school} />{me.school}</span>
          <div style={{ marginTop: 12, fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.nickname}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: '#AEAEB2' }}>티켓 발급 완료</div>
        </div>
        <div style={{ width: 0, borderLeft: '1px dashed rgba(255,255,255,0.2)', margin: '14px 0' }} />
        <div style={{ width: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="clock" size={28} color="#FFD60A" stroke={1.8} /><span style={{ fontSize: 13, fontWeight: 600, color: '#FFD60A' }}>결제 대기</span></div>
        <span style={{ position: 'absolute', right: 93, top: -10, width: 20, height: 20, borderRadius: 10, background: C.bg }} />
        <span style={{ position: 'absolute', right: 93, bottom: -10, width: 20, height: 20, borderRadius: 10, background: C.bg }} />
      </div>

      <Label style={{ marginTop: 26 }}>부스에서 결제</Label>
      <Card style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: C.inkGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="store" size={20} color="#FFFFFF" stroke={1.8} /></span>
        <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>이 화면을 운영진에게 보여 주세요</span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: C.ink2 }}>현금이나 이체 모두 돼요. {BOOTH.location}</span></span>
      </Card>

      <Label>계좌로 보내기</Label>
      <Account amount={pay?.amount ?? 2000} tag={me.depositor_tag ?? ""} />

      <Link href="/pending?help=1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 44, marginTop: 18, fontSize: 15, color: C.sub, textUnderlineOffset: 3 }}>입금했는데 5분 넘게 그대로예요</Link>
      <FootBar style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15, color: C.ink2, height: 40 }}><Spinner size={16} />확인되면 자동으로 넘어가요</div>
      </FootBar>
    </Screen>
  );
}

function Help({ amount, tag, left, onDone }: { amount: number; tag: string; left: number; onDone: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [remain, setRemain] = useState(left);

  async function find() {
    if (!name.trim()) return;
    setBusy(true); setMsg('');
    try {
      const r = await api.findMyDeposit(name.trim());
      if (r.result === 'ok') return onDone();
      setRemain((n) => Math.max(0, n - 1));
      setMsg({ not_found: '그 이름으로 들어온 입금을 못 찾았어요. 통장에 찍힌 이름 그대로인지 확인해 주세요.',
        ambiguous: '같은 이름의 입금이 여러 건이에요. 부스로 와 주세요.', no_pending: '대기 중인 결제가 없어요.',
        too_many_attempts: '여러 번 실패했어요. 부스로 와 주세요.' }[r.result] ?? '');
    } catch { setMsg('잠시 후 다시 시도해 주세요.'); }
    setBusy(false);
  }

  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back="/pending" />
        <Title sub="입금하고 5분이 지났다면 아래를 확인해 주세요.">입금이 아직<br />확인되지 않았어요</Title>
      </div>
      <Label>자주 있는 이유</Label>
      <Card>
        <div style={{ padding: '14px 14px 14px 0', display: 'flex', gap: 12, borderBottom: C.sep }}><Tile icon="pen" bg={TILE.orange} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 600 }}>입금자명이 달라요</div>
            <div style={{ marginTop: 3, fontSize: 14, lineHeight: 1.45, color: C.sub }}>입금자명(받는 분에게 표시)을 <b className="tnum" style={{ color: C.ink }}>{tag}</b>로 바꿔서 보내야 자동으로 찾아요.</div></div></div>
        <div style={{ padding: '14px 14px 14px 0', display: 'flex', gap: 12 }}><Tile icon="won" bg={TILE.orange} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 600 }}>금액이 달라요</div>
            <div style={{ marginTop: 3, fontSize: 14, lineHeight: 1.45, color: C.sub }}>보낼 금액은 <b style={{ color: C.ink }}>{amount.toLocaleString()}원</b>이에요. 더 보냈다면 부스에서 돌려드려요.</div></div></div>
      </Card>
      <Label><label htmlFor="dep">실제로 적은 입금자명</label></Label>
      <div style={{ margin: '0 16px', ...C.card, padding: '0 8px 0 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `inset 0 0 0 2px ${C.ink}` }}>
        <input id="dep" value={name} onChange={(e) => setName(e.target.value)} placeholder="통장에 찍힌 이름" onKeyDown={(e) => { if (e.key === 'Enter') find(); }}
          style={{ flex: 1, minWidth: 0, height: 56, border: 0, background: 'transparent', fontSize: 17 }} />
        <button onClick={find} disabled={busy || !name.trim() || remain <= 0}
          style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: C.inkGrad, color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {busy ? <Spinner light size={14} /> : '이걸로 찾기'}</button>
      </div>
      <Note>통장에 찍힌 이름 그대로 적어 주세요. 금액이 맞으면 바로 승인돼요. (남은 시도 {remain}번)</Note>
      <ErrorText>{msg}</ErrorText>
      <FootBar>
        <div style={{ height: 64, borderRadius: 18, background: '#FFFFFF', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: C.inkGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="store" size={18} color="#FFFFFF" /></span>
          <span style={{ flex: 1, fontSize: 15, lineHeight: 1.4 }}>그래도 안 되면 부스로 와 주세요<br /><span style={{ color: C.sub }}>{BOOTH.location} · 입금 내역을 보여 주면 바로 승인해 드려요</span></span>
        </div>
      </FootBar>
    </Screen>
  );
}

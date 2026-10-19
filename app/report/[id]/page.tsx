'use client';
import { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { C, ErrorText, Icon, Loading, Note, Row, Screen, Spinner, Title, TopBar } from '@/components/ui';

const REASONS = [
  ['photo', '부적절한 사진이에요'], ['fake', '다른 사람 사진을 쓴 것 같아요'], ['rude', '불쾌한 소개글이에요'],
  ['minor', '미성년자로 보여요'], ['spam', '광고·홍보 목적 같아요'], ['other', '기타'],
] as const;
type Reason = (typeof REASONS)[number][0];

export default function ReportPage() {
  return <Suspense fallback={<Loading />}><Report /></Suspense>;
}

function Report() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const name = useSearchParams().get('name') ?? '이 사람';
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!reason) return;
    setBusy(true); setErr('');
    try { await api.report(id, reason, detail); router.replace('/browse'); }
    catch { setErr('신고하지 못했어요. 부스 운영진에게 직접 알려 주세요.'); setBusy(false); }
  }

  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back={() => router.back()} />
        <Title sub="운영진만 볼 수 있어요. 신고하면 이 사람은 다시 보이지 않아요.">{name} 님을 신고할까요?</Title>
      </div>
      <div role="radiogroup" style={{ margin: '24px 16px 0', ...C.card, paddingLeft: 14 }}>
        {REASONS.map(([k, label], i) => (
          <Row key={k} last={i === REASONS.length - 1} onClick={() => setReason(k)}>
            <span style={{ flex: 1 }}>{label}</span>
            <span role="radio" aria-checked={reason === k} style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: reason === k ? C.ink : 'transparent', boxShadow: reason === k ? 'none' : 'inset 0 0 0 1.5px #C7C7CC' }}>
              {reason === k && <Icon name="check" size={13} color="#FFFFFF" stroke={3.2} />}</span>
          </Row>))}
      </div>
      {(reason === 'other' || reason === 'rude') && <>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 300))} placeholder="어떤 일이 있었는지 적어 주세요 (선택)" rows={3}
          style={{ display: 'block', width: 'calc(100% - 32px)', margin: '12px 16px 0', ...C.card, border: 0, padding: 14, fontSize: 16, resize: 'none' }} />
      </>}
      <Note>급한 일이면 부스 운영진에게 바로 말해 주세요.</Note>
      <ErrorText>{err}</ErrorText>
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '12px 16px calc(20px + var(--safe-b))' }}>
          <button onClick={submit} disabled={!reason || busy} style={{ width: '100%', height: 56, borderRadius: 28, border: 0, background: reason ? C.red : '#C7C7CC', color: '#FFFFFF', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
            {busy ? <Spinner light /> : '신고하기'}</button>
          <button onClick={() => router.back()} style={{ width: '100%', height: 48, marginTop: 4, border: 0, background: 'none', fontSize: 16, color: C.ink2, cursor: 'pointer' }}>취소</button>
        </div>
      </div>
    </Screen>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { homeFor } from '@/lib/useMe';
import { schoolOf } from '@/lib/school';
import { C, Card, ErrorText, Icon, InkButton, FootBar, Label, Note, Row, Screen, SchoolLogo, Tile, TILE, Title, TopBar } from '@/components/ui';

const LEN = 8;          // Supabase 이메일 OTP 길이 (Authentication > Email > OTP Length 와 같아야 함)
const RESEND = 60;      // 다시 받기까지 초

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const [tries, setTries] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const school = schoolOf(email);
  const looksDone = /@.+\..+/.test(email.trim());

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function sendCode() {
    if (!school) return;
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error && /rate|seconds/i.test(error.message)) {
      // 1분 안에 다시 요청한 경우: 이미 보낸 코드가 유효하니 코드 입력으로 넘어감
      setStep('code'); setCode(''); setTries(0); setLeft(60);
      setErr('방금 보낸 코드가 아직 유효해요. 메일함의 가장 최근 코드를 입력해 주세요.');
      setTimeout(() => codeRef.current?.focus(), 50);
      return;
    }
    if (error) {
      setErr(/rate|seconds/i.test(error.message) ? '잠시 후 다시 시도해 주세요. 코드를 너무 자주 요청했어요.'
        : (error.status ?? 0) >= 500 ? '지금 인증 메일을 보낼 수 없어요. 부스 운영진에게 알려 주세요.' : '코드를 보내지 못했어요. 메일 주소를 확인해 주세요.');
      return;
    }
    setStep('code'); setCode(''); setTries(0); setLeft(RESEND); setErr('');
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(token: string) {
    setBusy(true); setErr('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    if (error) {
      setBusy(false);
      const n = tries + 1;
      setTries(n); setShakeKey((k) => k + 1); setCode('');
      setErr(/expired/i.test(error.message) ? '코드 유효 시간이 지났어요. 새 코드를 받아 주세요.' : `코드가 맞지 않아요.${n < 3 ? ` ${3 - n}번 더 틀리면 새 코드를 받아야 해요.` : ' 새 코드를 받아 주세요.'}`);
      return;
    }
    const st = await api.myState().catch(() => null);
    router.replace(homeFor(st));
  }

  if (step === 'email') {
    const wrong = looksDone && !school;
    return (
      <Screen>
        <div style={{ padding: '16px 20px 0' }}>
          <TopBar back="/start" label="" />
          <Title sub="인증 코드를 보내서 과기원 학생인지 확인할게요.">학교 메일을 알려 주세요</Title>
        </div>
        <div style={{ margin: '28px 16px 0', ...C.card, padding: '0 8px 0 16px', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `inset 0 0 0 2px ${wrong ? C.red : C.ink}` }}>
          <label htmlFor="email" style={{ position: 'absolute', left: -9999 }}>학교 이메일</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" autoFocus placeholder="학번@gm.gist.ac.kr"
            value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
            style={{ flex: 1, minWidth: 0, height: 56, border: 0, background: 'transparent', fontSize: 17 }} />
          {email && <button aria-label="지우기" onClick={() => setEmail('')} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="close" size={12} color={C.sub} stroke={3} /></button>}
        </div>
        {school && (
          <div role="status" style={{ margin: '12px 16px 0', height: 56, borderRadius: 16, background: '#1C1C1E', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
            <SchoolLogo size={28} school={school} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{school} 학생이네요</span>
            <span style={{ width: 24, height: 24, borderRadius: 12, background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={13} color="#FFFFFF" stroke={3.6} /></span>
          </div>
        )}
        {wrong && (
          <div role="alert" style={{ margin: '12px 16px 0', borderRadius: 16, background: '#FFF1EF', padding: '14px 16px', display: 'flex', gap: 10 }}>
            <Icon name="alert" size={20} color={C.red} stroke={2.2} style={{ marginTop: 1 }} />
            <span style={{ fontSize: 15, lineHeight: 1.5, color: C.ink2 }}><b style={{ color: C.red }}>학교 메일이 아니에요.</b><br />6개 과기원 학교 메일만 쓸 수 있어요.<br />
              <span style={{ fontSize: 14, color: C.sub }}>GIST는 학부 @gm.gist.ac.kr, 대학원 @gist.ac.kr</span></span>
          </div>
        )}
        {!school && !wrong && <Note style={{ marginTop: 12 }}>KAIST, POSTECH, GIST, UNIST, DGIST, KENTECH 학교 메일만 쓸 수 있어요.</Note>}
        <ErrorText>{err}</ErrorText>
        <FootBar><InkButton onClick={sendCode} disabled={!school} busy={busy}>인증 코드 받기</InkButton></FootBar>
      </Screen>
    );
  }

  const bad = !!err && tries > 0;
  const digits = code.padEnd(LEN, ' ').slice(0, LEN).split('');
  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back={() => { setStep('email'); setErr(''); }} />
        <Title sub={<>{email.trim()}로 {LEN}자리 코드를 보냈어요.</>}>인증 코드를 입력해 주세요</Title>
      </div>
      <div aria-hidden="true" style={{ margin: '22px 16px 0', height: 72, position: 'relative', filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.25))' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(160deg, #343437 0%, #1C1C1E 70%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
          WebkitMask: 'radial-gradient(circle at 72% 0, transparent 9.5px, #000 10px), radial-gradient(circle at 72% 100%, transparent 9.5px, #000 10px)', WebkitMaskComposite: 'source-in',
          mask: 'radial-gradient(circle at 72% 0, transparent 9.5px, #000 10px), radial-gradient(circle at 72% 100%, transparent 9.5px, #000 10px)', maskComposite: 'intersect' } as React.CSSProperties}>
          <SchoolLogo size={34} school={school ?? undefined} />
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AEAEB2' }}>입장권 발급 중</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 17, fontWeight: 700 }}>{school}</span></span>
          <span style={{ width: '28%', display: 'flex', justifyContent: 'center', gap: 5 }}>
            {['d1', 'd2', 'd3'].map((d) => <span key={d} className={d} style={{ width: 7, height: 7, borderRadius: 4, background: '#FF7136' }} />)}</span>
        </div>
        <div style={{ position: 'absolute', left: '72%', top: 12, bottom: 12, borderLeft: '1.5px dashed rgba(255,255,255,0.22)' }} />
      </div>

      <label htmlFor="otp" style={{ position: 'absolute', left: -9999 }}>인증 코드 {LEN}자리</label>
      <input id="otp" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={LEN} value={code} autoFocus
        onChange={(e) => {
          if (tries >= 3) return;
          const v = e.target.value.replace(/\D/g, '').slice(0, LEN);
          setCode(v); if (err) setErr('');
          if (v.length === LEN) verify(v);
        }}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
      <div key={shakeKey} className={bad ? 'shake' : ''} onClick={() => codeRef.current?.focus()}
        style={{ margin: '20px 16px 0', display: 'grid', gridTemplateColumns: `repeat(${LEN}, minmax(0, 1fr))`, gap: 6, cursor: 'text' }}>
        {digits.map((d, i) => {
          const cur = i === code.length && !busy;
          return <span key={i} aria-hidden="true" className="tnum" style={{ height: 56, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700,
            background: bad ? '#FFF5F4' : '#FFFFFF', color: bad ? C.red : C.ink,
            boxShadow: bad ? `inset 0 0 0 1.5px ${C.red}` : cur ? `inset 0 0 0 2px ${C.ink}` : '0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)' }}>
            {d.trim() || (cur ? <span className="caret" style={{ width: 2, height: 26, background: '#EC4A12', borderRadius: 1 }} /> : '')}</span>;
        })}
      </div>
      <ErrorText>{err}</ErrorText>

      <Label>메일이 안 오나요?</Label>
      <Card>
        <Row><Tile icon="mail" bg={TILE.grey} /><span style={{ flex: 1, fontSize: 16 }}>스팸함·프로모션함을 확인해 주세요</span></Row>
        <Row onClick={() => { setStep('email'); setErr(''); }}><Tile icon="pen" bg={TILE.grey} />
          <span style={{ flex: 1, fontSize: 16, lineHeight: 1.4 }}>메일 주소 고치기<br /><span style={{ fontSize: 14, color: C.sub }}>{email.trim()}</span></span>
          <Icon name="chev" size={16} color={C.sub} stroke={2.2} /></Row>
        <Row last onClick={left > 0 ? undefined : sendCode}><Tile icon="refresh" bg={TILE.grey} />
          <span style={{ flex: 1, fontSize: 16 }}>새 코드 받기</span>
          <span className="tnum" style={{ fontSize: 15, color: C.sub }}>{left > 0 ? `0:${String(left).padStart(2, '0')} 후` : '지금 받기'}</span></Row>
      </Card>

      <FootBar><InkButton onClick={() => verify(code)} disabled={code.length < LEN || tries >= 3} busy={busy}>확인</InkButton></FootBar>
    </Screen>
  );
}

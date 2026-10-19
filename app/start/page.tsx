'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { homeFor } from '@/lib/useMe';
import { OrangeButton, SchoolLogo, Wordmark } from '@/components/ui';
import { REQUIRE_SCHOOL_EMAIL } from '@/lib/config';
import { SCHOOLS } from '@/lib/school';

const BOKEH = [
  'radial-gradient(110% 80% at 80% 15%, rgba(120,200,190,0.45) 0%, rgba(120,200,190,0) 55%), radial-gradient(90% 70% at 15% 70%, rgba(240,190,120,0.38) 0%, rgba(240,190,120,0) 60%), linear-gradient(160deg, #46484D 0%, #2A2B2E 100%)',
  'radial-gradient(110% 80% at 50% 10%, rgba(170,150,230,0.45) 0%, rgba(170,150,230,0) 55%), radial-gradient(90% 70% at 85% 80%, rgba(255,140,110,0.38) 0%, rgba(255,140,110,0) 60%), linear-gradient(160deg, #4A484E 0%, #2C2B2F 100%)',
  'radial-gradient(120% 80% at 18% 12%, rgba(255,168,120,0.55) 0%, rgba(255,168,120,0) 55%), radial-gradient(90% 70% at 88% 62%, rgba(112,132,210,0.45) 0%, rgba(112,132,210,0) 60%), linear-gradient(160deg, #4B4B50 0%, #2C2C2E 100%)',
];
const FAN = [
  { left: '8%', top: 52, rot: -12, z: 1, school: 'UNIST', bg: BOKEH[0], blur: true },
  { left: '41%', top: 48, rot: 11, z: 2, school: 'KAIST', bg: BOKEH[1], blur: true },
  { left: '24%', top: 22, rot: -2, z: 3, school: 'POSTECH', bg: BOKEH[2], blur: false },
];
const NOTCH = 'radial-gradient(circle at 0 216px, transparent 9.5px, #000 10px), radial-gradient(circle at 100% 216px, transparent 9.5px, #000 10px)';

export default function Start() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // 학교 메일 인증을 끈 동안: 익명 계정으로 바로 시작
  async function startAnon() {
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInAnonymously();
    if (error) { setBusy(false); setErr('지금 시작할 수 없어요. 잠시 후 다시 시도해 주세요.'); return; }
    router.replace('/ticket');
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) router.replace(homeFor(await api.myState().catch(() => null)));
    });
    api.publicStats().then((s) => setCount(s.active)).catch(() => {});
  }, [router]);

  return (
    <div className="screen" style={{ background: '#0E0E10', color: '#FFFFFF', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(75% 40% at 50% 30%, rgba(242,85,27,0.6) 0%, rgba(242,85,27,0) 70%), radial-gradient(90% 40% at 50% 105%, rgba(80,100,190,0.35) 0%, rgba(80,100,190,0) 70%), #0E0E10' }} />
      <div style={{ position: 'relative', zIndex: 2, padding: '18px 20px 0', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark />
        {count !== null && count > 0 && (
          <span style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.2)',
            WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
            <span className="live" style={{ width: 8, height: 8, borderRadius: 4, background: '#34C759', boxShadow: '0 0 0 3px rgba(52,199,89,0.25)' }} />
            지금 <span className="tnum">{count}</span>명 참여 중</span>
        )}
      </div>

      <div aria-hidden="true" style={{ position: 'relative', height: 'min(372px, 44dvh)', marginTop: 14, width: 'min(100%, 390px)', alignSelf: 'center' }}>
        {FAN.map((f) => (
          <div key={f.school} style={{ position: 'absolute', left: f.left, top: f.top, width: 200, height: 284, transform: `rotate(${f.rot}deg) scale(var(--fan, 1))`, transformOrigin: '50% 0',
            zIndex: f.z, filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.5))' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', background: '#1C1C1E',
              WebkitMask: NOTCH, WebkitMaskComposite: 'source-in', mask: NOTCH, maskComposite: 'intersect' } as React.CSSProperties}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 216, background: f.bg }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: 'linear-gradient(to bottom, rgba(28,28,30,0) 0%, #1C1C1E 100%)' }} />
              </div>
              {!f.blur && <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center' }}>
                <span style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 }}>?</span></div>}
              <span style={{ position: 'absolute', left: 10, top: 12, height: 26, padding: '0 10px 0 4px', borderRadius: 13, background: 'rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}><SchoolLogo />{f.school}</span>
              <div style={{ position: 'absolute', left: 14, right: 14, top: 176, fontSize: 20, fontWeight: 700 }}>{f.blur ? ' ' : '누구일까요'}</div>
              <div style={{ position: 'absolute', left: 14, right: 14, top: 215, borderTop: '1px dashed rgba(255,255,255,0.22)' }} />
              <div style={{ position: 'absolute', left: 14, right: 14, top: 228, display: 'flex', gap: 14 }}>
                <span style={{ height: 8, width: 34, borderRadius: 4, background: 'rgba(255,255,255,0.18)' }} />
                <span style={{ height: 8, flex: 1, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} /></div>
              <div style={{ position: 'absolute', left: 14, top: 246, height: 8, width: 120, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 24px' }}>
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.035em' }}>오늘 하루,<br />다른 과기원 사람과<br />이어져 볼래요?</h1>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.78)' }}>6개 과기원 학생만 들어올 수 있어요. 마음에 들면 티켓을 뜯어 하트를 보내세요.</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>{SCHOOLS.map((s) => <SchoolLogo key={s} size={22} school={s} />)}</div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', padding: '24px 16px calc(26px + var(--safe-b))' }}>
        {REQUIRE_SCHOOL_EMAIL ? <OrangeButton href="/login">학교 메일로 시작하기</OrangeButton>
          : <OrangeButton onClick={startAnon} busy={busy}>시작하기</OrangeButton>}
        {err && <div role="alert" style={{ marginTop: 10, textAlign: 'center', fontSize: 14, color: '#FF8A80' }}>{err}</div>}
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>행사가 끝나면 7일 안에 사진과 연락처를 모두 지워요.</div>
      </div>
    </div>
  );
}

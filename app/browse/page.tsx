'use client';
// 둘러보기: 한 장씩. 스텁을 오른쪽으로 뜯거나 하트 버튼 → 하트, 사진을 위로 밀거나 X → 넘기기, 사진 좌우 탭 → 사진 넘기기
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Card as Profile } from '@/lib/api';
import { useMe, usePhotoUrls } from '@/lib/useMe';
import { BOOTH } from '@/lib/config';
import { cardMask, curl, STUB_H, TearStub } from '@/components/TearStub';
import { MatchOverlay, type Partner } from '@/components/MatchOverlay';
import { C, Heart, Icon, InkButton, Loading, SchoolLogo, Spinner } from '@/components/ui';

const TEAR = 110, NEXT = 80;
type Phase = 'idle' | 'torn' | 'out' | 'passed' | 'enter';
const BOKEH = 'radial-gradient(120% 80% at 18% 12%, rgba(255,168,120,0.42) 0%, rgba(255,168,120,0) 55%), radial-gradient(90% 70% at 88% 62%, rgba(112,132,210,0.38) 0%, rgba(112,132,210,0) 60%), linear-gradient(160deg, #4B4B50 0%, #2C2C2E 100%)';

export default function Browse() {
  const router = useRouter();
  const { me, setMe, refresh } = useMe('active');
  const [card, setCard] = useState<Profile | null>(null);
  const [empty, setEmpty] = useState<{ passed: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [photo, setPhoto] = useState(0);
  const [sdrag, setSdrag] = useState(false);
  const [dx, setDx] = useState(0);
  const [cdrag, setCdrag] = useState(false);
  const [cdy, setCdy] = useState(0);
  const [toast, setToast] = useState<{ text: string; partner?: Partner; charge?: boolean } | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [W, setW] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef({ x0: 0, cx0: 0, cy0: 0, cmx: 0 });
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const urls = usePhotoUrls([...(card?.photos ?? []), me?.photos[0]]);

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, [card]);

  const load = useCallback(async () => {
    try {
      const r = await api.nextProfile();
      if ('empty' in r) { setCard(null); setEmpty({ passed: r.passed_count }); api.publicStats().then((s) => setActive(s.active)).catch(() => {}); }
      else { setEmpty(null); setCard(r); setPhoto(0); }
    } catch (e) { if (e instanceof ApiError && e.code === 'not_active') router.replace('/'); }
  }, [router]);
  useEffect(() => { if (me) load(); }, [me?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // 볼 사람이 없을 때는 20초마다 새로 확인
  useEffect(() => {
    if (!empty) return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [empty, load]);

  const showNext = useCallback(async () => {
    await load();
    setPhase('enter'); setDx(0); setCdy(0);
    later(30, () => setPhase('idle'));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (t: { text: string; partner?: Partner; charge?: boolean }, ms = 1700) => { setToast(t); later(ms, () => setToast((x) => (x === t ? null : x))); };

  async function send() {
    if (!card || !me || phase !== 'idle') return;
    if (me.hearts < 1) { setSdrag(false); setDx(0); flash({ text: '하트가 다 떨어졌어요', charge: true }, 2600); return; }
    setSdrag(false); setPhase('torn');
    const target = card;
    const req = api.sendHeart(target.id);
    later(1250, () => setPhase('out'));
    try {
      const r = await req;
      setMe({ ...me, hearts: r.hearts, matched: me.matched + (r.matched ? 1 : 0) });
      if (r.matched && r.partner) flash({ text: `${target.nickname} 님과 매칭됐어요`, partner: r.partner }, 5000);
      else flash({ text: `${target.nickname} 님께 하트를 보냈어요` });
    } catch (e) {
      flash({ text: e instanceof ApiError ? e.message : '하트를 보내지 못했어요.' });
      refresh();
    }
    later(1600, () => { showNext(); });
  }

  async function pass() {
    if (!card || phase !== 'idle') return;
    setPhase('passed'); setCdrag(false); setSdrag(false); setDx(0);
    const id = card.id;
    const done = api.pass(id).catch(() => {});
    later(400, async () => { await done; showNext(); });
  }

  // ── 스텁 끌기
  const sDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'idle') return;
    drag.current.x0 = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId);
    setSdrag(true); setDx(0);
  };
  const sMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!sdrag) return;
    const d = Math.max(0, e.clientX - drag.current.x0);
    setDx(d < 140 ? d : 140 + (d - 140) * 0.35);
  };
  const sUp = () => { if (!sdrag) return; if (dx > TEAR) send(); else { setSdrag(false); setDx(0); } };

  // ── 사진 끌기/탭
  const cDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'idle') return;
    if ((e.target as HTMLElement).closest?.('button, a')) return;
    Object.assign(drag.current, { cx0: e.clientX, cy0: e.clientY, cmx: 0 });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setCdrag(true); setCdy(0);
  };
  const cMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!cdrag) return;
    const d = e.clientY - drag.current.cy0;
    drag.current.cmx = Math.abs(e.clientX - drag.current.cx0);
    setCdy(d < 0 ? d : d * 0.2);
  };
  const cUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!cdrag || !card) return;
    const moved = Math.abs(cdy) > 10 || drag.current.cmx > 10;
    if (cdy < -NEXT) { pass(); return; }
    if (!moved) {
      const r = e.currentTarget.getBoundingClientRect();
      const left = e.clientX - r.left < r.width / 2;
      setPhoto((p) => Math.max(0, Math.min(card.photos.length - 1, p + (left ? -1 : 1))));
    }
    setCdrag(false); setCdy(0);
  };

  if (!me) return <Loading />;

  // ── 모션 값
  let t = 0, trans = 'transform .55s cubic-bezier(.2,1.35,.4,1)', stub: React.CSSProperties = { transform: 'none' };
  if (phase === 'torn' || phase === 'out') { t = 1.5; trans = 'transform .45s cubic-bezier(.3,.7,.3,1)';
    stub = { transform: 'translate(110px, 320px) rotate(26deg)', opacity: 0, transition: 'transform .7s cubic-bezier(.45,0,.85,.45) .32s, opacity .4s ease-in .6s' }; }
  else if (phase === 'enter') { trans = 'none'; stub = { transform: 'none', opacity: 1, transition: 'none' }; }
  else if (sdrag) { t = Math.min(1.1, dx / TEAR); trans = 'none'; stub = { cursor: 'grabbing' }; }
  let cardSt: React.CSSProperties;
  if (phase === 'out') cardSt = { transform: 'translateY(-16px) scale(.96)', opacity: 0, transition: 'transform .3s ease-in, opacity .3s ease-in' };
  else if (phase === 'passed') cardSt = { transform: 'translateY(-115%) rotate(-2deg)', opacity: 0, transition: 'transform .4s cubic-bezier(.5,0,.9,.5), opacity .35s ease-in' };
  else if (phase === 'enter') cardSt = { transform: 'translateY(60px) scale(.96)', opacity: 0, transition: 'none' };
  else if (cdrag) cardSt = { transform: `translateY(${cdy.toFixed(1)}px) scale(${(1 - Math.min(0.04, Math.abs(cdy) / 3000)).toFixed(4)})`, transition: 'none' };
  else cardSt = { transform: 'none', opacity: 1, transition: 'transform .42s cubic-bezier(.2,.9,.3,1), opacity .3s ease-out' };
  const ready = sdrag && dx > TEAR;
  const calm = phase === 'idle' && !sdrag && !cdrag;
  const banner = me.received_open > 0;
  const photoH = `clamp(260px, calc(100dvh - ${banner ? 420 : 352}px), 470px)`;

  const tags = card ? [...card.personality, ...card.interests, ...card.wants].slice(0, 6) : [];
  const ph = card ? card.photos[Math.min(photo, card.photos.length - 1)] : undefined;

  return (
    <div className="screen" style={{ background: C.glow, height: '100dvh', overflow: 'hidden' }}>
      {/* 머리 */}
      <div style={{ padding: '16px 16px 0 20px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em' }}>둘러보기</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/me" aria-label="내 티켓" style={ROUND}>
            {urls[me.photos[0]] ? <img src={urls[me.photos[0]]} alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover', objectPosition: '50% 20%' }} />
              : <span style={{ width: 36, height: 36, borderRadius: 18, background: '#D1D1D6' }} />}</Link>
          <Link href="/hearts" aria-label="하트 목록 보기" style={{ ...ROUND, position: 'relative' }}>
            <Icon name="chat" size={21} stroke={1.8} />
            {me.received_open > 0 && <span className="tnum" style={{ position: 'absolute', right: -1, top: -1, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: C.orange,
              color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.bg}` }}>{me.received_open}</span>}
          </Link>
          <Link href="/charge" aria-label={`남은 하트 ${me.hearts}개, 충전하기`} style={{ ...ROUND, width: 'auto', padding: '0 16px 0 14px', gap: 6, textDecoration: 'none' }}>
            <Heart size={17} /><span className="tnum" style={{ fontSize: 17, fontWeight: 700 }}>{me.hearts}</span></Link>
        </div>
      </div>

      {banner && (
        <Link href="/hearts?tab=recv" style={{ margin: '4px 16px 0', height: 64, borderRadius: 18, ...C.card, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', textDecoration: 'none' }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(180deg, #FFF1EA 0%, #FFDCCB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Heart size={20} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{me.received_open}명이 나에게 하트를 보냈어요</span>
            <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: C.sub }}>둘러보기에서 먼저 보여 드릴게요</span></span>
          <Icon name="chev" size={16} color={C.sub} stroke={2.2} />
        </Link>
      )}

      {card ? (
        <div ref={wrap} style={{ margin: '12px 16px 0', position: 'relative', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.22))', ...cardSt }}>
          <div onPointerDown={cDown} onPointerMove={cMove} onPointerUp={cUp} onPointerCancel={() => { setCdrag(false); setCdy(0); }}
            style={{ height: photoH, borderRadius: '26px 26px 0 0', overflow: 'hidden', position: 'relative', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
              background: BOKEH, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)', ...(W ? cardMask(W) : {}) }}>
            {ph && urls[ph] && <img src={urls[ph]} alt={`${card.nickname} 님 프로필 사진`} draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 28%', pointerEvents: 'none' }} />}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 100%)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, background: 'linear-gradient(to bottom, rgba(28,28,30,0) 0%, rgba(28,28,30,0.72) 55%, #1C1C1E 100%)' }} />
            {card.photos.length > 1 && <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', gap: 4 }}>
              {card.photos.map((_, i) => <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i === photo ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />)}</div>}
            <div style={{ position: 'absolute', top: 24, left: 12, display: 'flex', gap: 6 }}>
              <span style={{ ...GLASS, padding: '0 12px 0 6px', gap: 6 }}><SchoolLogo size={22} school={card.school} />{card.school}</span>
              {card.school !== me.school && <span style={{ ...GLASS, padding: '0 12px' }}>다른 학교</span>}
            </div>
            <Link href={`/report/${card.id}?name=${encodeURIComponent(card.nickname)}`} aria-label="신고하기"
              style={{ position: 'absolute', top: 18, right: 10, width: 44, height: 44, borderRadius: 22, ...GLASS_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="more" size={20} color="#FFFFFF" /></Link>
            <div style={{ position: 'absolute', left: 20, right: 20, bottom: 16, color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.nickname}</div>
                {card.common > 0 && <span style={{ height: 28, padding: '0 10px 0 8px', borderRadius: 14, background: C.orange, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Icon name="check" size={13} color="#FFFFFF" stroke={3} />통하는 점 {card.common}</span>}
              </div>
              {card.intro && <div style={{ marginTop: 4, fontSize: 15, lineHeight: 1.45, color: 'rgba(255,255,255,0.86)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.intro}</div>}
              {tags.length > 0 && <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 62, overflow: 'hidden' }}>
                {tags.map((tg) => { const m = card.matching_tags.includes(tg);
                  return <span key={tg} style={{ height: 28, padding: '0 11px', borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)',
                    ...(m ? { background: 'rgba(242,85,27,0.32)', boxShadow: 'inset 0 0 0 1px rgba(255,138,86,0.85)', color: '#FFFFFF' }
                          : { background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.92)' }) }}>{tg}</span>; })}
              </div>}
            </div>
          </div>

          <TearStub W={W} c={curl(t)} trans={trans} motion={stub} nudge={calm} label="오른쪽으로 끌어 뜯으면 하트 보내기. 아래 하트 버튼으로도 보낼 수 있어요"
            handlers={{ onPointerDown: sDown, onPointerMove: sMove, onPointerUp: sUp, onPointerCancel: sUp }}
            content={<>
              <div style={{ padding: '16px 20px 0', display: 'flex', gap: 18, color: '#FFFFFF' }}>
                <div><div style={STUB_L}>나이</div><div className="tnum" style={STUB_V}>{card.age}</div></div>
                {card.height ? <><div style={{ width: 0.5, background: 'rgba(255,255,255,0.16)' }} />
                  <div><div style={STUB_L}>키</div><div className="tnum" style={STUB_V}>{card.height}</div></div></> : null}
                <div style={{ width: 0.5, background: 'rgba(255,255,255,0.16)' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={STUB_L}>한 줄 스펙</div>
                  <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.spec || '—'}</div></div>
              </div>
              <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: sdrag ? 'transparent' : '#AEAEB2' }}>
                오른쪽으로 뜯으면 하트가 가요
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l5 5-5 5" /><path d="M13 7l5 5-5 5" /></svg>
              </div>
            </>} />

          <div aria-live="polite" style={{ position: 'absolute', right: 14, bottom: STUB_H - 33, zIndex: 3, pointerEvents: 'none', height: 30, padding: '0 12px 0 10px', borderRadius: 15,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700,
            ...(!sdrag ? { opacity: 0, transform: 'translateX(8px)', color: '#C7C7CC', background: 'rgba(58,58,60,0.92)', transition: 'opacity .18s ease-out, transform .18s ease-out' }
              : ready ? { opacity: 1, color: '#FFFFFF', background: C.orange, boxShadow: '0 6px 16px -6px rgba(236,74,18,0.7)', transition: 'opacity .18s ease-out, transform .18s ease-out, background .15s' }
              : { opacity: 1, color: '#D1D1D6', background: 'rgba(58,58,60,0.92)', transition: 'opacity .18s ease-out, transform .18s ease-out' }) }}>
            <Heart size={14} color="currentColor" />{ready ? '놓으면 하트가 가요' : '끝까지 당겨요'}
          </div>
        </div>
      ) : empty ? (
        <Empty passed={empty.passed} active={active} onReset={async () => { await api.resetPasses(); load(); }} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner size={24} /></div>
      )}

      {card && <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(112px + var(--safe-b))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        fontSize: 12, fontWeight: 600, color: C.sub, opacity: calm ? 1 : 0, transition: 'opacity .2s' }}>
        <Icon name="up" size={14} color={C.sub} stroke={2.4} />사진을 위로 밀면 다음 사람</div>}

      {phase === 'torn' && <div className="burst" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '43%', width: 120, height: 120, borderRadius: 60, background: C.orange, zIndex: 5,
        boxShadow: '0 0 0 10px rgba(255,255,255,0.35), 0 20px 50px rgba(236,74,18,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={58} color="#FFFFFF" /></div>}

      {toast && (
        <div className="toast" role="status" style={{ position: 'absolute', left: '50%', top: 84, transform: 'translateX(-50%)', zIndex: 6, minHeight: 48, padding: toast.partner || toast.charge ? '0 8px 0 18px' : '0 18px',
          borderRadius: 24, background: 'rgba(28,28,30,0.92)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10,
          whiteSpace: 'nowrap', fontSize: 15, fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
          {toast.text}
          {toast.partner && <button onClick={() => { setPartner(toast.partner!); setToast(null); }} style={TOAST_BTN}>보기</button>}
          {toast.charge && <Link href="/charge" style={{ ...TOAST_BTN, textDecoration: 'none' }}>충전</Link>}
        </div>
      )}

      {card && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 16px calc(24px + var(--safe-b))', display: 'flex', gap: 56, alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(242,242,247,0.78)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', backdropFilter: 'blur(24px) saturate(180%)', borderTop: '0.5px solid rgba(60,60,67,0.18)', zIndex: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button onClick={pass} aria-label="넘기기" style={{ ...BIG, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)' }}>
            <Icon name="close" size={22} stroke={2.2} /></button>
          <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>넘기기</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button onClick={send} aria-label="하트 1개 보내기" style={{ ...BIG, background: C.orange, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 18px -8px rgba(236,74,18,0.7)' }}>
            <Heart size={26} color="#FFFFFF" /></button>
          <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>하트 1개</span>
        </div>
      </div>}

      {partner && <MatchOverlay me={{ nickname: me.nickname, school: me.school, photo: me.photos[0] }} partner={partner} onClose={() => setPartner(null)} />}
    </div>
  );
}

function Empty({ passed, active, onReset }: { passed: number; active: number | null; onReset: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div style={{ margin: '0 10px', height: 240, borderRadius: 26, background: '#FFFFFF', boxShadow: '0 14px 30px -18px rgba(0,0,0,0.3)', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 50 }}>
        <span style={{ width: 52, height: 52, borderRadius: 26, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="people" size={26} stroke={1.8} /></span>
        {active !== null && <div style={{ marginTop: 14, fontSize: 15, color: C.ink2 }}>지금 참여 중인 사람 <b className="tnum">{active}</b>명</div>}
        <div style={{ position: 'absolute', left: 16, right: 16, top: 168, borderTop: '1.5px dashed rgba(0,0,0,0.12)' }} />
        <div style={{ position: 'absolute', top: 190, fontSize: 14, color: C.sub }}>다음 티켓 준비 중</div>
      </div>
      <h2 style={{ margin: '34px 0 0', textAlign: 'center', fontSize: 22, fontWeight: 700 }}>지금은 더 볼 사람이 없어요</h2>
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 15, lineHeight: 1.55, color: C.ink2 }}>새로 가입하는 사람이 생기면 바로 보여 드릴게요.<br />경기 끝나고 다시 들러 보세요.</p>
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '12px 16px calc(20px + var(--safe-b))' }}>
          {passed > 0 && <InkButton busy={busy} onClick={async () => { setBusy(true); await onReset(); setBusy(false); }}>넘긴 사람 다시 보기</InkButton>}
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14, color: C.sub }}>궁금한 건 부스 운영진에게 · {BOOTH.location}</div>
        </div>
      </div>
    </div>
  );
}

const ROUND: React.CSSProperties = { width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink };
const GLASS_BG: React.CSSProperties = { background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.22)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' };
const GLASS: React.CSSProperties = { ...GLASS_BG, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: 600 };
const STUB_L: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#AEAEB2' };
const STUB_V: React.CSSProperties = { marginTop: 2, fontSize: 20, fontWeight: 700 };
const BIG: React.CSSProperties = { width: 62, height: 62, border: 0, borderRadius: 31, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const TOAST_BTN: React.CSSProperties = { height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: C.orange, color: '#FFFFFF', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, cursor: 'pointer' };

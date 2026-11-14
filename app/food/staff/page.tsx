'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { errText, lineName, minsAgo, SCHOOLS, staff, store, won, type Board, type Line, type StaffOrder } from '@/lib/food';

type Tab = 'counter' | 'kitchen' | 'settings';

export default function Staff() {
  const [pin, setPin] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setPin(store.get('ef:pin')); setReady(true); }, []);
  if (!ready) return <main className="ef" />;
  if (!pin) return <PinGate onOk={(p) => { store.set('ef:pin', p); setPin(p); }} />;
  return <Desk pin={pin} onLogout={() => { store.del('ef:pin'); setPin(null); }} />;
}

function PinGate({ onOk }: { onOk: (p: string) => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr('');
    try { await staff.board(v); unlockAudio(); onOk(v); } catch (e) { setErr(errText(e)); }
    setBusy(false);
  }
  return (
    <main className="ef" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <span className="seal" style={{ width: 64, height: 64, fontSize: 22, transform: 'rotate(-4deg)' }}>직원</span>
        <h1 className="serif" style={{ fontSize: 28, margin: '16px 0 4px' }}>어흐~동 운영석</h1>
        <p className="sub" style={{ margin: '0 0 20px' }}>직원 번호 6자리를 넣어 주세요.</p>
        <input className="field tnum" inputMode="numeric" autoFocus value={v} maxLength={6}
          onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && v.length === 6 && go()}
          style={{ textAlign: 'center', fontSize: 28, letterSpacing: '.3em', height: 64 }} aria-label="직원 번호" />
        {err && <p style={{ color: 'var(--hong)', fontWeight: 600, margin: '10px 0 0' }}>{err}</p>}
        <button className="btn btn-hong" style={{ marginTop: 16 }} disabled={v.length !== 6 || busy} onClick={go}>{busy ? '확인 중…' : '들어가기'}</button>
      </div>
    </main>
  );
}

// ───────── 소리 (직원 화면 진입 터치로 오디오 잠금 해제) ─────────
let ctx: AudioContext | null = null;
function unlockAudio() { try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); ctx.resume(); } catch { /* 무시 */ } }
function beep(kind: 'order' | 'deposit') {
  if (!ctx) return;
  const notes = kind === 'order' ? [880, 1320] : [660, 520];
  notes.forEach((f, i) => {
    const o = ctx!.createOscillator(); const g = ctx!.createGain(); const t = ctx!.currentTime + i * 0.16;
    o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + 0.15);
  });
}

function Desk({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>(() => (store.get('ef:tab') as Tab) || 'counter');
  const [b, setB] = useState<Board | null>(null);
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(false);
  const seen = useRef<{ paid: Set<number>; dep: Set<number> } | null>(null);

  const load = useCallback(async () => {
    try {
      const nb = await staff.board(pin); setOffline(false);
      const paid = new Set(nb.paid.map((x) => x.id)); const dep = new Set(nb.deposits.map((x) => x.id));
      if (seen.current) {
        if ([...paid].some((id) => !seen.current!.paid.has(id))) beep('order');
        else if ([...dep].some((id) => !seen.current!.dep.has(id))) beep('deposit');
      }
      seen.current = { paid, dep };
      setB(nb);
    } catch (e) {
      if (errText(e) === '번호가 틀렸어요.') onLogout(); else setOffline(true);
    }
  }, [pin, onLogout]);

  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t); }, [load]);
  useEffect(() => { store.set('ef:tab', tab); }, [tab]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  async function act(p: Promise<unknown>, done?: string) {
    try { await p; if (done) setToast(done); } catch (e) { setToast(errText(e)); }
    load();
  }

  const counterBadge = b ? b.pending.length + b.deposits.length : 0;
  return (
    <main className="ef" style={{ maxWidth: 1100, paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }} onPointerDown={unlockAudio}>
      {toast && <div className="toast" role="status">{toast}</div>}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 6px' }}>
        <span className="seal" style={{ width: 34, height: 34, fontSize: 14, transform: 'rotate(-4deg)' }}>어흐</span>
        <h1 className="serif" style={{ margin: 0, fontSize: 22, flex: 1 }}>{{ counter: '입금 확인', kitchen: '주방', settings: '설정 · 매출' }[tab]}</h1>
        {offline ? <span className="pill" style={{ background: 'var(--hong)', color: '#fff' }}>연결 끊김</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }} className="sub"><span className="dot live" />실시간</span>}
        {b && !b.settings.open && <span className="pill" style={{ background: 'var(--ink)', color: '#FFF6EC' }}>주문 멈춤</span>}
      </header>

      {!b ? <p className="sub" style={{ padding: 16 }}>불러오는 중…</p> : (
        <>
          {tab === 'counter' && <Counter b={b} pin={pin} act={act} />}
          {tab === 'kitchen' && <Kitchen b={b} pin={pin} act={act} />}
          {tab === 'settings' && <Settings b={b} pin={pin} act={act} onLogout={onLogout} />}
        </>
      )}

      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, background: 'var(--card)', borderTop: '1px solid var(--line)',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {([['counter', '입금', counterBadge], ['kitchen', '주방', b?.paid.length ?? 0], ['settings', '설정', 0]] as const).map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ height: 64, fontSize: 16, fontWeight: tab === k ? 800 : 500, color: tab === k ? 'var(--hong)' : 'var(--ink2)', position: 'relative' }}>
            {label}
            {n > 0 && <span className="tnum" style={{ marginLeft: 6, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: 'var(--hong)', color: '#FFF6EC', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
            {tab === k && <span style={{ position: 'absolute', top: 0, left: '30%', right: '30%', height: 3, borderRadius: 2, background: 'var(--hong)' }} />}
          </button>
        ))}
      </nav>
    </main>
  );
}

type Act = (p: Promise<unknown>, done?: string) => void;

const short = (items: Line[]) => items.map((l) => `${lineName(l)}×${l.qty}`).join(', ');

function Counter({ b, pin, act }: { b: Board; pin: string; act: Act }) {
  return (
    <div style={{ padding: '6px 16px 0', display: 'grid', gap: 22 }}>
      <section>
        <H>입금 기다리는 주문 <span className="faint">{b.pending.length}</span></H>
        <p className="faint" style={{ fontSize: 13, margin: '-4px 0 10px' }}>입금 문자가 오면 자동으로 사라져요. 은행 앱에서 직접 확인했을 때만 [입금 확인]을 누르세요.</p>
        {!b.pending.length && <Empty>기다리는 주문이 없어요</Empty>}
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {b.pending.map((o) => (
            <div key={o.id} className="card" style={{ padding: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', alignItems: 'center' }}>
              <div className="tnum num" style={{ fontSize: 32, color: 'var(--hong)', letterSpacing: '.04em', gridRow: 'span 2' }}>{o.tag}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b className="tnum" style={{ fontSize: 19 }}>{won(o.amount ?? 0)}</b>
                <span className="faint tnum" style={{ fontSize: 13 }}>{minsAgo(o.created_at)}분 전</span>
              </div>
              <div className="sub" style={{ fontSize: 13, lineHeight: 1.4 }}>
                {o.name && <b style={{ color: 'var(--ink)' }}>{o.name} · </b>}{o.school && `${o.school} · `}{short(o.items)}
                {!!o.discount && <span style={{ color: 'var(--hong)' }}> · 할인 {won(o.discount)}</span>}
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-hong" style={{ height: 46, fontSize: 15 }} onClick={() => act(staff.approve(pin, o.id), `${o.tag} 입금 확인`)}>입금 확인</button>
                <Twice className="btn btn-ghost" style={{ height: 46, width: 100, fontSize: 15 }} onConfirm={() => act(staff.set(pin, o.id, 'cancelled'), '취소했어요')}>취소</Twice>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H>확인 못 한 입금 <span className="faint">{b.deposits.length}</span></H>
        <p className="faint" style={{ fontSize: 13, margin: '-4px 0 10px' }}>번호 없이 들어온 입금이에요. 금액이 같은 주문과 연결하세요.</p>
        {!b.deposits.length && <Empty>모두 처리됐어요</Empty>}
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {b.deposits.map((d) => {
            const cands = b.pending.filter((o) => o.amount === d.amount);
            return (
              <div key={d.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b style={{ fontSize: 18 }}>{d.name || '(이름 없음)'}</b>
                  <b className="tnum" style={{ fontSize: 18 }}>{won(d.amount)}</b>
                </div>
                <div className="faint" style={{ fontSize: 12, margin: '4px 0 10px', wordBreak: 'break-all' }}>{minsAgo(d.received_at)}분 전 · {d.raw}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cands.map((o) => (
                    <button key={o.id} className="pill btn-hong" onClick={() => act(staff.approve(pin, o.id, d.id), `${o.tag}에 연결했어요`)}>
                      {o.tag}{o.name ? ` ${o.name}` : ''} 연결
                    </button>
                  ))}
                  {!cands.length && <span className="faint" style={{ fontSize: 13, alignSelf: 'center' }}>같은 금액 주문 없음</span>}
                  <Twice className="pill btn-line" style={{ marginLeft: 'auto' }} onConfirm={() => act(staff.ignore(pin, d.id), '숨겼어요')}>무시</Twice>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Kitchen({ b, pin, act }: { b: Board; pin: string; act: Act }) {
  const sum = (pred: (l: Line) => boolean, mult: (l: Line) => number = () => 1) =>
    b.paid.reduce((s, o) => s + o.items.filter(pred).reduce((a, l) => a + l.qty * mult(l), 0), 0);
  const mild = sum((l) => l.taste === 'mild'), spicy = sum((l) => l.taste === 'spicy');
  const odeng = sum((l) => l.id.startsWith('odeng'), (l) => (l.id === 'odeng3' ? 3 : 1));
  return (
    <div style={{ padding: '6px 16px 0' }}>
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <span className="sub" style={{ fontWeight: 600 }}>지금 만들 것</span>
        <Big n={mild} label="일반맛" /><Big n={spicy} label="매운맛" hong /><Big n={odeng} label="어묵 꼬치" />
      </div>

      {!b.paid.length && <Empty>만들 주문이 없어요. 쉬어 가요.</Empty>}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {b.paid.map((o) => <KitchenCard key={o.id} o={o} onDone={() => act(staff.set(pin, o.id, 'ready'), `${o.call_no}번 호출`)} />)}
      </div>

      <H style={{ marginTop: 26 }}>호출 중 · 받으러 올 손님 <span className="faint">{b.ready.length}</span></H>
      {!b.ready.length && <Empty>없어요</Empty>}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {b.ready.map((o) => (
          <div key={o.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="seal tnum" style={{ width: 54, height: 54, fontSize: 28 }}>{o.call_no}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="faint" style={{ fontSize: 12 }}>{minsAgo(o.ready_at)}분째 대기</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="pill btn-hong" onClick={() => act(staff.set(pin, o.id, 'done'), `${o.call_no}번 수령`)}>수령</button>
                <button className="pill btn-line" onClick={() => act(staff.set(pin, o.id, 'paid'))}>되돌리기</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitchenCard({ o, onDone }: { o: StaffOrder; onDone: () => void }) {
  const m = minsAgo(o.paid_at); const late = m >= 8;
  return (
    <div className="card rise" style={{ padding: 14, borderColor: late ? 'var(--hong)' : undefined, borderWidth: late ? 2 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span className="seal tnum" style={{ width: 60, height: 60, fontSize: 32 }}>{o.call_no}</span>
        <div style={{ flex: 1 }}>
          <div className="tnum" style={{ fontWeight: 700, color: late ? 'var(--hong)' : 'var(--ink2)' }}>{m}분 전 입금{late && ' · 늦어요!'}</div>
          {o.method === 'manual' && <div className="faint" style={{ fontSize: 12 }}>직원 수동 확인</div>}
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 6 }}>
        {o.items.map((l, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 19, fontWeight: 700 }}>
            <span className="tnum" style={{ minWidth: 34, color: 'var(--hong)' }}>{l.qty}×</span>
            <span>{l.id === 'udon' ? '우동' : l.id === 'udon_re' ? '재방문 우동' : l.name}</span>
            {l.taste && <span className="pill" style={{ height: 26, fontSize: 13, background: l.taste === 'spicy' ? 'var(--hong)' : 'var(--paper2)', color: l.taste === 'spicy' ? '#FFF6EC' : 'var(--ink)' }}>
              {l.taste === 'spicy' ? '매운맛 🌶' : '일반맛'}</span>}
          </li>
        ))}
      </ul>
      <button className="btn btn-hong" style={{ height: 50 }} onClick={onDone}>다 됐어요 · 호출</button>
    </div>
  );
}

function Settings({ b, pin, act, onLogout }: { b: Board; pin: string; act: Act; onLogout: () => void }) {
  const s = b.stats;
  return (
    <div style={{ padding: '6px 16px 0', display: 'grid', gap: 22, maxWidth: 640 }}>
      <section>
        <H>오늘 성적</H>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Tile k="매출" v={won(s.revenue)} wide />
          <Tile k="우동" v={`${s.bowls}그릇`} sub={`일반 ${s.mild} · 매운 ${s.spicy}`} />
          <Tile k="어묵" v={`${s.odeng}개`} sub={`주문 ${s.orders}건`} />
        </div>
      </section>

      <section>
        <H>주문 받기</H>
        <Toggle on={b.settings.open} label={b.settings.open ? '받는 중 — 손님이 주문할 수 있어요' : '멈춤 — 메뉴는 보이지만 주문은 안 돼요'}
          onChange={(v) => act(staff.settings(pin, { open: v }), v ? '주문을 다시 받아요' : '주문을 멈췄어요')} />
      </section>

      <section>
        <H>품절</H>
        <div className="card" style={{ padding: '0 16px' }}>
          {b.menu.map((m, i) => (
            <div key={m.id} style={{ borderTop: i ? '1px solid var(--line)' : 0 }}>
              <Toggle flat on={!m.soldout} label={`${m.name} · ${won(m.price)}`} offText="품절"
                onChange={(v) => act(staff.menu(pin, m.id, !v), v ? `${m.name} 다시 판매` : `${m.name} 품절`)} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <H>어흐순위 꼴찌 할인</H>
        <p className="faint" style={{ fontSize: 13, margin: '-4px 0 10px' }}>고른 학교 손님은 우동 한 그릇당 {won(b.settings.discount_amount)} 할인. 매시간 바꿔 주세요.</p>
        <div className="chips">
          {SCHOOLS.map((sc) => (
            <button key={sc} className="chip" aria-pressed={b.settings.discount_school === sc}
              onClick={() => act(staff.settings(pin, { discount_school: sc }), `${sc} 할인 시작`)}>{sc}</button>
          ))}
          <button className="chip" aria-pressed={!b.settings.discount_school} onClick={() => act(staff.settings(pin, { clear_discount: true }), '할인 껐어요')}>할인 없음</button>
        </div>
      </section>

      <button className="btn btn-line" style={{ height: 48, fontSize: 15 }} onClick={onLogout}>이 기기에서 나가기</button>
    </div>
  );
}

// ───────── 작은 부품 ─────────
function H({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px', display: 'flex', gap: 6, ...style }}>{children}</h2>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="faint" style={{ padding: '18px 0', textAlign: 'center', fontSize: 15, border: '1.5px dashed var(--line)', borderRadius: 14 }}>{children}</div>;
}
function Big({ n, label, hong }: { n: number; label: string; hong?: boolean }) {
  return <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
    <b className="tnum" style={{ fontSize: 30, color: hong ? 'var(--hong)' : 'var(--ink)' }}>{n}</b><span className="sub" style={{ fontSize: 14 }}>{label}</span></span>;
}
function Tile({ k, v, sub, wide }: { k: string; v: string; sub?: string; wide?: boolean }) {
  return (
    <div className="card" style={{ padding: 16, gridColumn: wide ? '1 / -1' : undefined }}>
      <div className="sub" style={{ fontSize: 14 }}>{k}</div>
      <div className="tnum num" style={{ fontSize: wide ? 34 : 26, color: wide ? 'var(--hong)' : 'var(--ink)', marginTop: 2 }}>{v}</div>
      {sub && <div className="faint tnum" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Toggle({ on, label, onChange, flat, offText }: { on: boolean; label: string; onChange: (v: boolean) => void; flat?: boolean; offText?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={flat ? '' : 'card'}
      style={{ width: '100%', minHeight: 56, padding: flat ? '0' : '0 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{label}</span>
      {!on && offText && <span className="seal" style={{ height: 24, padding: '0 8px', fontSize: 13 }}>{offText}</span>}
      <span style={{ width: 50, height: 30, borderRadius: 15, background: on ? 'var(--ok)' : 'var(--paper2)', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
      </span>
    </button>
  );
}
// 실수 방지: 3초 안에 두 번 눌러야 실행
function Twice({ children, onConfirm, className, style }: { children: React.ReactNode; onConfirm: () => void; className?: string; style?: React.CSSProperties }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return <button className={className} style={{ ...style, ...(armed ? { background: 'var(--ink)', color: '#FFF6EC' } : {}) }}
    onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>{armed ? '한 번 더' : children}</button>;
}

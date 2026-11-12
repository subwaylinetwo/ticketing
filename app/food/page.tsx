'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { food, errText, INSTA, lineName, SCHOOLS, store, TASTE, won, type Public, type Taste } from '@/lib/food';
import { Corners, Flourish, Frame } from './ornaments';

type Cart = Record<string, number>; // key: "udon:mild" | "odeng1"
const keyOf = (id: string, taste?: Taste | null) => (taste ? `${id}:${taste}` : id);

export default function FoodMenu() {
  const router = useRouter();
  const [pub, setPub] = useState<Public | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const load = useCallback(() => food.pub().then(setPub).catch(() => {}), []);
  useEffect(() => {
    load(); setLast(store.get('ef:last'));
    setSchool(store.get('ef:school')); setName(store.get('ef:name') ?? '');
    const t = setInterval(load, 15000); return () => clearInterval(t);
  }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t); }, [toast]);

  const menu = useMemo(() => Object.fromEntries((pub?.menu ?? []).map((m) => [m.id, m])), [pub]);
  const lines = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([k, qty]) => {
    const [id, t] = k.split(':'); const m = menu[id];
    return { key: k, id, taste: (t as Taste) || null, qty, name: m?.name ?? id, price: m?.price ?? 0 };
  }), [cart, menu]);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const bowls = lines.filter((l) => l.id === 'udon').reduce((s, l) => s + l.qty, 0);
  const discount = pub?.discount_school && school === pub.discount_school ? Math.min(subtotal - 100, pub.discount_amount * bowls) : 0;

  const add = (k: string, d: number) => { setCart((c) => ({ ...c, [k]: Math.max(0, Math.min(20, (c[k] ?? 0) + d)) })); if (d > 0) setBump((b) => b + 1); };

  async function place() {
    setBusy(true);
    try {
      const o = await food.place(lines.map((l) => ({ id: l.id, qty: l.qty, ...(l.taste ? { taste: l.taste } : {}) })), school, name.trim());
      store.set('ef:last', o.token); if (school) store.set('ef:school', school); if (name.trim()) store.set('ef:name', name.trim());
      router.push(`/food/o/${o.token}`);
    } catch (e) { setToast(errText(e)); setBusy(false); load(); }
  }

  const udon = menu.udon, o1 = menu.odeng1, o3 = menu.odeng3;
  const closed = !!pub && !pub.open;
  const save3 = o1 && o3 ? o1.price * 3 - o3.price : 0;

  return (
    <main className="ef" style={{ paddingBottom: 130, position: 'relative' }}>
      {toast && <div className="toast" role="status">{toast}</div>}
      <Corners />

      {/* 상태 */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '14px 16px 0', fontSize: 13 }}>
        <span className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600 }}>
          {pub ? (closed ? <><span className="dot" style={{ background: 'var(--ink3)' }} />준비 중</>
            : <><span className="dot live" />영업 중 · 조리 대기 {pub.waiting}</>) : '불러오는 중…'}
        </span>
      </div>

      {/* 간판: 현수막 메뉴판과 같은 구성 */}
      <header style={{ position: 'relative', textAlign: 'center', padding: '12px 16px 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/food/mark.png" alt="어흐~동 마크" width={64} height={64} style={{ display: 'block', margin: '0 auto' }} />
        <div className="serif" style={{ color: 'var(--hong)', fontSize: 19, marginTop: 10 }}>어흐~동</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: -2 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 40, lineHeight: 1.2, color: 'var(--hong)' }}>메뉴판</h1>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--hong2)' }}>
          한 번 보면 <b>어~흐</b>, 한 입 먹으면 <b>어흐어~흐</b>
        </p>
        {last && <a href={`/food/o/${last}`} className="pill btn-line" style={{ textDecoration: 'none', marginTop: 12, height: 32, fontSize: 13 }}>내 주문 보기 →</a>}
      </header>

      {pub?.discount_school && (
        <div className="rise" style={{ position: 'relative', margin: '18px 16px 0', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hongSoft)', border: '1.5px solid rgba(162,64,39,.35)', borderRadius: 6 }}>
          <span className="seal" style={{ width: 44, height: 44, fontSize: 14, lineHeight: 1.05, textAlign: 'center', transform: 'rotate(-4deg)', flexShrink: 0 }}>꼴찌<br />위로</span>
          <div style={{ fontSize: 14, lineHeight: 1.45 }}>
            <b>이번 시간 어흐순위 꼴찌 {pub.discount_school}</b><br />
            <span className="sub">우동 한 그릇당 {won(pub.discount_amount)} 할인 · 받을 때 학생증 보여주세요</span>
          </div>
        </div>
      )}

      {/* 메뉴 칸 */}
      <section style={{ position: 'relative', padding: '34px 16px 0', display: 'grid', gap: 30 }}>
        {(['mild', 'spicy'] as Taste[]).map((t) => {
          const k = keyOf('udon', t); const q = cart[k] ?? 0;
          return (
            <Frame key={t} title={`${TASTE[t].name} (${TASTE[t].sub})`} dim={udon?.soldout}>
              <div style={{ textAlign: 'center' }}>
                <div className="tnum" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--hong2)' }}>{udon?.soldout ? '다 팔렸소' : won(udon?.price ?? 0)}</div>
                <p className="sub" style={{ margin: '6px 0 14px', fontSize: 13.5, lineHeight: 1.5 }}>
                  {t === 'mild' ? '사누키 우동면 · 바삭 덴카스 · 유부 · 나루토마키' : '같은 우동에 청양고추·고춧가루로 칼칼하게'}
                </p>
                <Counter q={q} disabled={!udon || udon.soldout || closed} label={TASTE[t].name}
                  onMinus={() => add(k, -1)} onPlus={() => add(k, 1)} big />
              </div>
            </Frame>
          );
        })}

        <Frame title="꼬치어묵" dim={o1?.soldout && o3?.soldout}>
          {([['odeng1', '1개', o1], ['odeng3', '3개', o3]] as const).map(([id, label, m], i) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: i ? '1px dashed var(--line)' : 0, opacity: m?.soldout ? .45 : 1 }}>
              <div style={{ flex: 1 }}>
                <span className="tnum" style={{ fontSize: 24, fontWeight: 800, color: 'var(--hong2)' }}>{m?.soldout ? '다 팔렸소' : won(m?.price ?? 0)}</span>
                <span className="sub" style={{ marginLeft: 8, fontSize: 15, fontWeight: 600 }}>{label}</span>
                {id === 'odeng3' && save3 > 0 && !m?.soldout && <span style={{ color: 'var(--hong)', fontSize: 13, fontWeight: 700, marginLeft: 6 }}>{won(save3)} 이득</span>}
              </div>
              <Counter q={cart[id] ?? 0} disabled={!m || m.soldout || closed} label={`꼬치어묵 ${label}`} onMinus={() => add(id, -1)} onPlus={() => add(id, 1)} />
            </div>
          ))}
          <p className="faint" style={{ margin: '6px 18px 4px', fontSize: 13, textAlign: 'center' }}>어묵 국물은 공짜 · 부스에서 종이컵에 떠 드려요</p>
        </Frame>

        {/* 인스타그램 이벤트 (현수막과 같은 문구) */}
        <div className="frame" style={{ padding: '18px 20px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Insta /><span className="serif" style={{ fontSize: 20, color: 'var(--hong)' }}>인스타그램 이벤트</span>
          </div>
          <div style={{ margin: '10px 0 12px' }}><Flourish /></div>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, fontSize: 15.5, textAlign: 'left', maxWidth: 270, marginInline: 'auto' }}>
            <li>1. <b style={{ color: 'var(--hong)' }}>@{INSTA}</b> 태그하기</li>
            <li>2. 스토리에 인증샷 올리기</li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5 }}>
            어흐~동을 → <b style={{ color: 'var(--hong)' }}>어흐묵 우동</b>으로 바꿔드립니다~
          </p>
          <p className="faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>올린 화면을 받을 때 보여주세요</p>
        </div>

        <p className="sub" style={{ textAlign: 'center', fontSize: 13.5, margin: '-8px 0 0' }}>계좌이체만 받아요 · 입금하면 자동으로 확인돼요</p>
      </section>

      {/* 하단 바 */}
      <div className="bar">
        <button className="btn btn-hong" disabled={!count || closed} onClick={() => setOpen(true)} style={{ justifyContent: 'space-between', padding: '0 18px', borderRadius: 8 }}>
          <span key={bump} className={count ? 'bump' : ''} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 14, background: 'rgba(255,246,238,.22)', fontSize: 15 }}>{count}</span>
          <span style={{ fontSize: 17 }}>{closed ? '지금은 주문을 받지 않아요' : count ? '주문하기' : '메뉴를 담아 주세요'}</span>
          <span className="tnum" style={{ fontSize: 16 }}>{count ? won(subtotal) : ''}</span>
        </button>
      </div>

      {/* 주문 확인 시트 */}
      {open && (
        <>
          <div className="ef-sheet-bg" onClick={() => !busy && setOpen(false)} />
          <div className="ef-sheet" role="dialog" aria-label="주문 확인">
            <div className="ef-grab" />
            <h2 className="serif" style={{ margin: '0 0 12px', fontSize: 23, color: 'var(--hong)' }}>주문 확인</h2>
            <div className="card" style={{ padding: '4px 16px', borderRadius: 8 }}>
              {lines.map((l, i) => (
                <div key={l.key}>
                  {i > 0 && <hr className="hair" />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{lineName(l)}</div>
                      <div className="tnum sub" style={{ fontSize: 14 }}>{won(l.price * l.qty)}</div>
                    </div>
                    <Counter q={l.qty} onMinus={() => add(l.key, -1)} onPlus={() => add(l.key, 1)} label={lineName(l)} />
                  </div>
                </div>
              ))}
              {!lines.length && <p className="sub" style={{ padding: '12px 0', margin: 0 }}>장바구니가 비었어요.</p>}
            </div>

            <h3 style={{ fontSize: 15, margin: '18px 0 8px' }}>학교 <span className="faint" style={{ fontWeight: 400 }}>· 선택</span></h3>
            <div className="chips">
              {SCHOOLS.map((s) => (
                <button key={s} className="chip" aria-pressed={school === s} onClick={() => setSchool(school === s ? null : s)}>
                  {s}{pub?.discount_school === s && ' · 할인'}
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: 15, margin: '18px 0 8px' }}>입금하는 분 이름 <span className="faint" style={{ fontWeight: 400 }}>· 선택</span></h3>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" maxLength={20} autoComplete="name" style={{ borderRadius: 8 }} />
            <p className="faint" style={{ fontSize: 13, margin: '6px 2px 0', lineHeight: 1.45 }}>입금 번호를 깜빡하고 보냈을 때 이 이름으로 찾아 드려요.</p>

            <div className="card" style={{ padding: 16, marginTop: 18, display: 'grid', gap: 8, fontSize: 15, borderRadius: 8 }}>
              <Row k="합계" v={won(subtotal)} />
              {discount > 0 && <Row k={`꼴찌 위로 할인 (${pub?.discount_school})`} v={`−${won(discount)}`} hong />}
              <hr className="hair" />
              <Row k="보낼 금액" v={won(subtotal - discount)} big />
            </div>

            <button className="btn btn-hong" style={{ marginTop: 16, borderRadius: 8 }} disabled={busy || !lines.length} onClick={place}>
              {busy ? '주문 넣는 중…' : `${won(subtotal - discount)} 주문하고 입금하기`}
            </button>
            <button className="btn" style={{ height: 48, fontWeight: 600, color: 'var(--ink2)' }} disabled={busy} onClick={() => setOpen(false)}>더 담을래요</button>
          </div>
        </>
      )}
    </main>
  );
}

function Row({ k, v, big, hong }: { k: string; v: string; big?: boolean; hong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span className={big ? '' : 'sub'} style={{ fontWeight: big ? 700 : 400, color: hong ? 'var(--hong)' : undefined }}>{k}</span>
      <span className="tnum" style={{ fontWeight: big ? 800 : 600, fontSize: big ? 22 : 15, color: hong ? 'var(--hong)' : undefined }}>{v}</span>
    </div>
  );
}

function Counter({ q, onMinus, onPlus, disabled, label, big }: { q: number; onMinus: () => void; onPlus: () => void; disabled?: boolean; label: string; big?: boolean }) {
  if (big && q === 0) {
    return <button className="btn btn-hong" style={{ height: 48, borderRadius: 8, maxWidth: 240, margin: '0 auto' }} disabled={disabled} onClick={onPlus}>
      <span style={{ fontSize: 17 }}>한 그릇 담기</span></button>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: big ? 14 : 6, height: big ? 48 : undefined }}>
      {q > 0 && <>
        <button className="step" aria-label={`${label} 빼기`} onClick={onMinus} style={big ? { width: 44, height: 44, borderRadius: 8 } : { borderRadius: 8 }}>−</button>
        <span className="tnum" style={{ minWidth: 26, textAlign: 'center', fontSize: big ? 24 : 18, fontWeight: 800, color: 'var(--hong2)' }}>{q}</span>
      </>}
      <button className="step on" aria-label={`${label} 더하기`} disabled={disabled} onClick={onPlus} style={big ? { width: 44, height: 44, borderRadius: 8 } : { borderRadius: 8 }}>+</button>
    </div>
  );
}

function Insta() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <defs><linearGradient id="efIg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#F9A33A" /><stop offset=".5" stopColor="#E1306C" /><stop offset="1" stopColor="#7B3FE4" /></linearGradient></defs>
      <rect x="1" y="1" width="24" height="24" rx="7" fill="url(#efIg)" />
      <rect x="6" y="6" width="14" height="14" rx="4.5" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="13" cy="13" r="3.4" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="18.2" cy="7.8" r="1.2" fill="#fff" />
    </svg>
  );
}

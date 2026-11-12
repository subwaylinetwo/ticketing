'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { food, errText, lineName, SCHOOLS, store, TASTE, won, type Public, type Taste } from '@/lib/food';

type Cart = Record<string, number>; // key: "udon:mild" | "odeng1"
const keyOf = (id: string, taste?: Taste | null) => (taste ? `${id}:${taste}` : id);

export default function FoodMenu() {
  const router = useRouter();
  const [pub, setPub] = useState<Public | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [taste, setTaste] = useState<Taste>('mild');
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

  const udon = menu.udon;
  const closed = pub && !pub.open;

  return (
    <main className="ef" style={{ paddingBottom: 120 }}>
      {toast && <div className="toast" role="status">{toast}</div>}

      {/* 상단 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', fontSize: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          {pub ? (closed ? <><span className="dot" style={{ background: 'var(--ink3)' }} />준비 중</>
            : <><span className="dot live" />영업 중 · 조리 대기 {pub.waiting}</>) : <span className="faint">불러오는 중…</span>}
        </span>
        {last && <a href={`/food/o/${last}`} className="pill btn-line" style={{ textDecoration: 'none' }}>내 주문 보기</a>}
      </div>

      {/* 간판 */}
      <header style={{ textAlign: 'center', padding: '6px 16px 4px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/food/mark.png" alt="어흐동 — 우동 그릇 삿갓을 쓴 어우동" width={216} height={216}
          style={{ display: 'block', margin: '0 auto' }} />
        <p className="serif" style={{ margin: '2px 0 0', fontSize: 17, color: 'var(--ink2)' }}>한 번 보면 어흐, 한 입 맛보면 어흐어흐</p>
      </header>

      {pub?.discount_school && (
        <div className="card rise" style={{ margin: '16px 16px 0', padding: 14, display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hongSoft)', borderColor: 'rgba(164,22,26,.25)' }}>
          <span className="seal" style={{ width: 46, height: 46, fontSize: 15, lineHeight: 1.05, textAlign: 'center', transform: 'rotate(-4deg)', flexShrink: 0 }}>꼴찌<br />위로</span>
          <div style={{ fontSize: 15, lineHeight: 1.45 }}>
            <b>이번 시간 어흐순위 꼴찌 {pub.discount_school}</b><br />
            <span className="sub">우동 한 그릇당 {won(pub.discount_amount)} 빼 드려요. 받을 때 학생증 보여주세요.</span>
          </div>
        </div>
      )}

      {/* 음식발기 */}
      <section style={{ padding: '26px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 30, color: 'var(--hong)' }}>음식발기</h1>
          <span className="faint" style={{ fontSize: 14 }}>차림표</span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)', alignSelf: 'center' }} />
        </div>

        {/* 우동 */}
        <article className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
          {udon?.soldout && <SoldOut />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <span className="seal" style={{ height: 22, padding: '0 8px', fontSize: 13, marginBottom: 8 }}>대표</span>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>튀김우동</h2>
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>사누키 우동면 · 바삭 덴카스 · 유부<br />나루토마키 · 대파 · 진한 가쓰오 국물</p>
            </div>
            <Bowl />
          </div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 12px' }}>{won(udon?.price ?? 5500)}</div>

          <div className="seg" role="group" aria-label="맛 고르기">
            {(['mild', 'spicy'] as Taste[]).map((t) => (
              <button key={t} aria-pressed={taste === t} onClick={() => setTaste(t)}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 16, color: t === 'spicy' ? 'var(--hong)' : undefined }}>{TASTE[t].name}{t === 'spicy' && ' 🌶'}</span>
                <span className="sub" style={{ fontSize: 13 }}>{TASTE[t].sub}</span>
                {(cart[keyOf('udon', t)] ?? 0) > 0 && <span className="tnum" style={{ float: 'right', marginTop: -20, fontWeight: 800, color: 'var(--hong)' }}>×{cart[keyOf('udon', t)]}</span>}
              </button>
            ))}
          </div>
          <button className="btn btn-hong" style={{ marginTop: 12 }} disabled={!udon || udon.soldout || !!closed} onClick={() => add(keyOf('udon', taste), 1)}>
            {TASTE[taste].name}으로 한 그릇 담기
          </button>
        </article>

        {/* 어묵 */}
        <article className="card" style={{ padding: '6px 18px', marginTop: 12 }}>
          {(['odeng1', 'odeng3'] as const).map((id, i) => {
            const m = menu[id]; const q = cart[id] ?? 0;
            return (
              <div key={id}>
                {i > 0 && <hr className="hair" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', opacity: m?.soldout ? .45 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div className="serif" style={{ fontSize: 21 }}>{id === 'odeng1' ? '꼬치어묵 하나' : '꼬치어묵 셋'}</div>
                    <div className="tnum" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                      {m?.soldout ? '다 팔렸어요' : won(m?.price ?? (id === 'odeng1' ? 1000 : 2500))}
                      {id === 'odeng3' && !m?.soldout && <span style={{ color: 'var(--hong)', fontWeight: 600, fontSize: 13, marginLeft: 6 }}>500원 이득</span>}
                    </div>
                  </div>
                  <Stepper q={q} disabled={!m || m.soldout || !!closed} onMinus={() => add(id, -1)} onPlus={() => add(id, 1)} label={m?.name ?? id} />
                </div>
              </div>
            );
          })}
        </article>

        {/* 안내 */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '18px 4px 0', display: 'grid', gap: 10, fontSize: 14, lineHeight: 1.5 }} className="sub">
          <li style={{ display: 'flex', gap: 10 }}><Mark>湯</Mark><span><b style={{ color: 'var(--ink)' }}>어묵 국물은 공짜.</b> 부스에서 종이컵에 떠 드려요.</span></li>
          <li style={{ display: 'flex', gap: 10 }}><Mark>記</Mark><span><b style={{ color: 'var(--ink)' }}>리뷰 쓰면 어묵 하나 더.</b> 올린 화면을 카운터에 보여주세요.</span></li>
          <li style={{ display: 'flex', gap: 10 }}><Mark>錢</Mark><span><b style={{ color: 'var(--ink)' }}>계좌이체만 받아요.</b> 입금하면 자동으로 확인돼요.</span></li>
        </ul>
      </section>

      {/* 하단 바 */}
      <div className="bar">
        <button className="btn btn-hong" disabled={!count || !!closed} onClick={() => setOpen(true)} style={{ justifyContent: 'space-between', padding: '0 18px' }}>
          <span key={bump} className={count ? 'bump' : ''} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 14, background: 'rgba(255,246,236,.2)', fontSize: 15 }}>{count}</span>
          <span>{closed ? '지금은 주문을 받지 않아요' : count ? '주문하기' : '메뉴를 담아 주세요'}</span>
          <span className="tnum" style={{ fontSize: 16 }}>{count ? won(subtotal) : ''}</span>
        </button>
      </div>

      {/* 주문 확인 시트 */}
      {open && (
        <>
          <div className="ef-sheet-bg" onClick={() => !busy && setOpen(false)} />
          <div className="ef-sheet" role="dialog" aria-label="주문 확인">
            <div className="ef-grab" />
            <h2 className="serif" style={{ margin: '0 0 12px', fontSize: 24 }}>주문 확인</h2>
            <div className="card" style={{ padding: '4px 16px' }}>
              {lines.map((l, i) => (
                <div key={l.key}>
                  {i > 0 && <hr className="hair" />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{lineName(l)}</div>
                      <div className="tnum sub" style={{ fontSize: 14 }}>{won(l.price * l.qty)}</div>
                    </div>
                    <Stepper q={l.qty} onMinus={() => add(l.key, -1)} onPlus={() => add(l.key, 1)} label={lineName(l)} />
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
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" maxLength={20} autoComplete="name" />
            <p className="faint" style={{ fontSize: 13, margin: '6px 2px 0', lineHeight: 1.45 }}>입금 번호를 깜빡하고 보냈을 때 이 이름으로 찾아 드려요.</p>

            <div className="card" style={{ padding: 16, marginTop: 18, display: 'grid', gap: 8, fontSize: 15 }}>
              <Row k="합계" v={won(subtotal)} />
              {discount > 0 && <Row k={`꼴찌 위로 할인 (${pub?.discount_school})`} v={`−${won(discount)}`} hong />}
              <hr className="hair" />
              <Row k="보낼 금액" v={won(subtotal - discount)} big />
            </div>

            <button className="btn btn-hong" style={{ marginTop: 16 }} disabled={busy || !lines.length} onClick={place}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: hong ? 'var(--hong)' : undefined }}>
      <span className={big ? '' : 'sub'} style={{ fontWeight: big ? 700 : 400, color: hong ? 'var(--hong)' : undefined }}>{k}</span>
      <span className="tnum" style={{ fontWeight: big ? 800 : 600, fontSize: big ? 22 : 15 }}>{v}</span>
    </div>
  );
}

function Stepper({ q, onMinus, onPlus, disabled, label }: { q: number; onMinus: () => void; onPlus: () => void; disabled?: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {q > 0 && <>
        <button className="step" aria-label={`${label} 빼기`} onClick={onMinus}>−</button>
        <span className="tnum" style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 17 }}>{q}</span>
      </>}
      <button className="step on" aria-label={`${label} 더하기`} disabled={disabled} onClick={onPlus}>+</button>
    </div>
  );
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="seal" style={{ width: 24, height: 24, fontSize: 13, flexShrink: 0, borderRadius: 5 }}>{children}</span>;
}

function SoldOut() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,251,243,.72)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="seal stamp" style={{ fontSize: 30, padding: '10px 18px', transform: 'rotate(-4deg)' }}>다 팔렸소</span>
    </div>
  );
}

function Bowl() {
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g className="steam" stroke="#A4161A" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".7">
        <path d="M30 26c-4-5 4-8 0-13" /><path d="M42 24c-4-5 4-8 0-13" /><path d="M54 26c-4-5 4-8 0-13" />
      </g>
      <path d="M10 38h64c0 18-13 30-32 30S10 56 10 38z" fill="#A4161A" />
      <path d="M10 38h64" stroke="#7C0E11" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 46c8 4 42 4 50 0" stroke="#FFF4E8" strokeWidth="1.6" fill="none" opacity=".6" />
      <circle cx="42" cy="54" r="5" fill="none" stroke="#FFF4E8" strokeWidth="1.6" opacity=".75" />
      <path d="M42 54m-2 0a2 2 0 1 0 4 0" stroke="#FFF4E8" strokeWidth="1.4" fill="none" opacity=".75" />
      <rect x="30" y="68" width="24" height="5" rx="2" fill="#7C0E11" />
    </svg>
  );
}

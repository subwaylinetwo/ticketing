'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errText, food, SCHOOLS, store, won } from '@/lib/food';
import { cart, useCart } from '@/lib/cart';
import { AppBar, BottomCTA, productOf, ProductArt, Steps, usePub, useToast } from '../ui';

export default function CartPage() {
  const router = useRouter();
  const { pub, price, soldout, reload } = usePub();
  const items = useCart();
  const [school, setSchool] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  useEffect(() => { setSchool(store.get('ef:school')); setName(store.get('ef:name') ?? ''); }, []);

  const subtotal = items.reduce((s, x) => s + x.qty * price(x.id), 0);
  const bowls = items.filter((x) => x.id === 'udon').reduce((s, x) => s + x.qty, 0);
  const discount = pub?.discount_school && school === pub.discount_school ? Math.min(subtotal - 100, pub.discount_amount * bowls) : 0;
  const total = subtotal - discount;
  const closed = !!pub && !pub.open;
  const blocked = items.some((x) => soldout(x.id));

  async function place() {
    setBusy(true);
    try {
      const o = await food.place(items.map((x) => ({ id: x.id, qty: x.qty, ...(x.taste ? { taste: x.taste } : {}) })), school, name.trim());
      store.set('ef:last', o.token); if (school) store.set('ef:school', school); else store.del('ef:school');
      if (name.trim()) store.set('ef:name', name.trim());
      cart.clear();
      router.replace(`/food/o/${o.token}`);
    } catch (e) { show(errText(e)); setBusy(false); reload(); }
  }

  if (!items.length) return (
    <main className="ef page">
      <AppBar title="장바구니" back="/food/menu" />
      <div style={{ textAlign: 'center', padding: '70px 24px 0' }}>
        <div style={{ opacity: .5 }}><ProductArt p={{ id: 'udon', taste: 'mild' }} size={120} /></div>
        <p className="serif" style={{ fontSize: 22, margin: '18px 0 6px' }}>장바구니가 비었어요</p>
        <p className="sub" style={{ margin: 0 }}>어흐~동 한 그릇 어때요?</p>
        <Link href="/food/menu" className="btn btn-hong" style={{ textDecoration: 'none', marginTop: 24, borderRadius: 14 }}>메뉴 보러 가기</Link>
      </div>
    </main>
  );

  return (
    <main className="ef page" style={{ paddingBottom: 120 }}>
      {toast}
      <AppBar title="장바구니" back="/food/menu" />
      <div style={{ padding: '6px 0 4px' }}><Steps at={0} /></div>

      <section style={{ padding: '16px 16px 0' }}>
        <div className="card" style={{ padding: '4px 14px', borderRadius: 16 }}>
          {items.map((x, i) => {
            const p = productOf(x.id, x.taste); const out = soldout(x.id);
            return (
              <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
                <span style={{ width: 58, height: 58, borderRadius: 12, background: 'var(--paper)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <ProductArt p={x} size={50} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p?.name ?? x.id} <span className="faint" style={{ fontWeight: 500, fontSize: 13 }}>{p?.sub}</span></div>
                  <div className="tnum sub" style={{ fontSize: 14, marginTop: 2 }}>{out ? <span style={{ color: 'var(--hong)', fontWeight: 700 }}>다 팔렸어요 · 빼 주세요</span> : won(price(x.id) * x.qty)}</div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="step" aria-label="빼기" onClick={() => cart.set(x.key, x.qty - 1)} style={{ width: 32, height: 32, borderRadius: 10, fontSize: 17 }}>{x.qty === 1 ? '×' : '−'}</button>
                  <b className="tnum" style={{ minWidth: 18, textAlign: 'center' }}>{x.qty}</b>
                  <button className="step on" aria-label="더하기" disabled={out} onClick={() => cart.set(x.key, x.qty + 1)} style={{ width: 32, height: 32, borderRadius: 10, fontSize: 17 }}>+</button>
                </span>
              </div>
            );
          })}
          <Link href="/food/menu" style={{ display: 'block', textAlign: 'center', padding: '12px 0', borderTop: '1px solid var(--line)', textDecoration: 'none', fontWeight: 700, color: 'var(--hong)', fontSize: 14.5 }}>+ 메뉴 더 담기</Link>
        </div>
      </section>

      <section style={{ padding: '22px 16px 0' }}>
        <h3 style={{ fontSize: 15.5, margin: '0 0 4px' }}>어느 학교세요? <span className="faint" style={{ fontWeight: 400, fontSize: 13 }}>선택</span></h3>
        <p className="faint" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
          {pub?.discount_school ? <>지금 <b style={{ color: 'var(--hong)' }}>{pub.discount_school}</b>는 우동 한 그릇당 {won(pub.discount_amount)} 할인 (받을 때 학생증 확인)</> : '시간마다 어흐순위 꼴찌 학교에 할인이 있어요'}
        </p>
        <div className="chips">
          {SCHOOLS.map((s) => (
            <button key={s} className="chip" aria-pressed={school === s} onClick={() => setSchool(school === s ? null : s)}>{s}{pub?.discount_school === s && ' · 할인'}</button>
          ))}
        </div>
      </section>

      <section style={{ padding: '22px 16px 0' }}>
        <h3 style={{ fontSize: 15.5, margin: '0 0 4px' }}>입금하는 분 이름 <span className="faint" style={{ fontWeight: 400, fontSize: 13 }}>선택</span></h3>
        <p className="faint" style={{ fontSize: 12.5, margin: '0 0 10px' }}>입금 번호를 깜빡하고 보냈을 때 이 이름으로 찾아 드려요</p>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="통장에 찍히는 이름" maxLength={20} autoComplete="name" style={{ borderRadius: 12 }} />
      </section>

      <section style={{ padding: '22px 16px 0' }}>
        <div className="card" style={{ padding: 16, display: 'grid', gap: 8, fontSize: 15, borderRadius: 16 }}>
          <Row k="주문 금액" v={won(subtotal)} />
          {discount > 0 && <Row k={`꼴찌 위로 할인 (${pub?.discount_school})`} v={`−${won(discount)}`} hong />}
          <hr className="hair" />
          <Row k="입금할 금액" v={won(total)} big />
        </div>
        <p className="faint" style={{ fontSize: 12.5, margin: '10px 4px 0', lineHeight: 1.5 }}>다음 화면에서 계좌와 입금 번호를 알려 드려요. 입금하면 자동으로 확인돼요.</p>
      </section>

      <BottomCTA>
        <button className="btn btn-hong" style={{ borderRadius: 14 }} disabled={busy || closed || blocked || !pub} onClick={place}>
          {closed ? '지금은 주문을 받지 않아요' : busy ? '주문 넣는 중…' : <><span className="tnum">{won(total)}</span>&nbsp;주문하기</>}
        </button>
      </BottomCTA>
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

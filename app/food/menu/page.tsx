'use client';
import { useState } from 'react';
import Link from 'next/link';
import { won } from '@/lib/food';
import { cart, useCart } from '@/lib/cart';
import { AppBar, BottomCTA, PRODUCTS, ProductArt, usePub, useToast, type Product } from '../ui';

export default function MenuPage() {
  const { pub, price, soldout } = usePub();
  const items = useCart();
  const [sel, setSel] = useState<Product | null>(null);
  const { toast, show } = useToast();
  const n = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.qty * price(x.id), 0);
  const closed = !!pub && !pub.open;
  const inCart = (key: string) => items.find((x) => x.key === key)?.qty ?? 0;

  const group = (ids: string[]) => PRODUCTS.filter((p) => ids.includes(p.id));

  return (
    <main className="ef page" style={{ paddingBottom: 120 }}>
      {toast}
      <AppBar title="메뉴판" back="/food" cartButton />

      {pub?.discount_school && (
        <div style={{ margin: '4px 16px 0', padding: '10px 14px', borderRadius: 12, background: 'var(--hongSoft)', fontSize: 13.5 }}>
          <b style={{ color: 'var(--hong)' }}>꼴찌 위로 할인</b> · {pub.discount_school} 학생은 우동 한 그릇당 {won(pub.discount_amount)} 할인
        </div>
      )}

      {([['우동', '국물까지 어흐어흐', ['udon']], ['재방문 반값', '두 번째 그릇은 3천원', ['udon_re']], ['사이드', '같이 먹으면 더 어흐', ['odeng1']]] as const).map(([title, sub, ids]) => (
        <section key={title} style={{ padding: '20px 16px 0' }}>
          <div className="section-t"><h2 className="serif">{title}</h2><span>{sub}</span></div>
          <div style={{ display: 'grid', gap: 10 }}>
            {group([...ids]).map((p) => {
              const out = soldout(p.id); const q = inCart(p.key);
              return (
                <button key={p.key} className="prod" disabled={out || closed} onClick={() => setSel(p)} style={{ opacity: out ? .55 : 1 }}>
                  <span className="art"><ProductArt p={p} size={80} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="serif" style={{ fontSize: 18, wordBreak: 'keep-all' }}>{p.name}</span>
                      {p.tag && <span className="tag">{p.tag}</span>}
                    </span>
                    <span className="sub" style={{ display: 'block', fontSize: 13, lineHeight: 1.45, margin: '3px 0 6px' }}>{p.sub} · {p.desc.split('.')[0]}</span>
                    <b className="tnum" style={{ fontSize: 17 }}>{out ? '다 팔렸어요' : pub ? won(price(p.id)) : '…'}</b>
                    {q > 0 && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: 'var(--hong)' }}>담음 {q}</span>}
                  </span>
                  {!out && <span className="addfab" aria-hidden="true">+</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="faint" style={{ textAlign: 'center', fontSize: 12.5, margin: '22px 16px 0' }}>어묵 국물은 공짜 · 부스에서 종이컵에 떠 드려요</p>

      {n > 0 && (
        <BottomCTA>
          <Link href="/food/cart" className="btn btn-hong" style={{ textDecoration: 'none', justifyContent: 'space-between', padding: '0 18px', borderRadius: 14 }}>
            <span style={{ minWidth: 28, height: 28, borderRadius: 14, background: 'rgba(255,246,238,.22)', display: 'inline-grid', placeItems: 'center', fontSize: 14 }}>{n}</span>
            <span>장바구니 보기</span>
            <span className="tnum">{won(total)}</span>
          </Link>
        </BottomCTA>
      )}

      {sel && <OptionSheet p={sel} unit={price(sel.id)} onClose={() => setSel(null)}
        onAdd={(q) => { cart.add(sel.id, sel.taste, q); setSel(null); show(`${sel.name} ${q}${sel.id.startsWith('udon') ? '그릇' : '개'} 담았어요`); }} />}
    </main>
  );
}

function OptionSheet({ p, unit, onClose, onAdd }: { p: Product; unit: number; onClose: () => void; onAdd: (q: number) => void }) {
  const [q, setQ] = useState(1);
  const u = p.id.startsWith('udon') ? '그릇' : '개';
  return (
    <>
      <div className="ef-sheet-bg" onClick={onClose} />
      <div className="ef-sheet" role="dialog" aria-label={`${p.name} 담기`} style={{ paddingTop: 8 }}>
        <div className="ef-grab" />
        <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 10px' }}>
          <div className="hero-art" style={{ width: 180, height: 180 }}><ProductArt p={p} size={160} /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 25 }}>{p.name}</h2>
          <span className="tag">{p.sub}</span>
        </div>
        <p className="sub" style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.6 }}>{p.desc}</p>

        <div className="card" style={{ marginTop: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14 }}>
          <span style={{ fontWeight: 700 }}>수량</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="step" aria-label="빼기" disabled={q <= 1} onClick={() => setQ(q - 1)} style={{ width: 40, height: 40, borderRadius: 12 }}>−</button>
            <b className="tnum" style={{ minWidth: 24, textAlign: 'center', fontSize: 20 }}>{q}</b>
            <button className="step on" aria-label="더하기" disabled={q >= 20} onClick={() => setQ(q + 1)} style={{ width: 40, height: 40, borderRadius: 12 }}>+</button>
          </span>
        </div>

        <button className="btn btn-hong" style={{ marginTop: 16, borderRadius: 14 }} onClick={() => onAdd(q)}>
          {q}{u} 담기 · <span className="tnum">{won(unit * q)}</span>
        </button>
      </div>
    </>
  );
}

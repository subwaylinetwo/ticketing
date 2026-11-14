'use client';
// 어흐동 화면 공통 부품: 상단바, 하단 버튼, 음식 그림, 진행 단계, 메뉴 정보
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { food, TASTE, type Public, type Taste } from '@/lib/food';
import { useCart } from '@/lib/cart';

// 손님 화면에 보일 상품 (가격·품절은 DB에서)
export type Product = { key: string; id: string; taste: Taste | null; name: string; sub: string; desc: string; tag?: string };
export const PRODUCTS: Product[] = [
  { key: 'udon:mild',  id: 'udon', taste: 'mild',  name: TASTE.mild.name,  sub: TASTE.mild.sub,  tag: '대표',
    desc: '사누키 우동면에 바삭한 덴카스, 유부, 나루토마키, 대파. 진한 가쓰오 국물.' },
  { key: 'udon:spicy', id: 'udon', taste: 'spicy', name: TASTE.spicy.name, sub: TASTE.spicy.sub, tag: '칼칼',
    desc: '같은 우동에 청양고추와 고춧가루를 더해 칼칼하게. 추운 날 딱.' },
  { key: 'udon_re:mild',  id: 'udon_re', taste: 'mild',  name: `재방문 ${TASTE.mild.name}`,  sub: TASTE.mild.sub,  tag: '반값',
    desc: '한 번 더 오신 분께 반값으로. 받을 때 지난 주문 화면을 보여주세요.' },
  { key: 'udon_re:spicy', id: 'udon_re', taste: 'spicy', name: `재방문 ${TASTE.spicy.name}`, sub: TASTE.spicy.sub, tag: '반값',
    desc: '한 번 더 오신 분께 반값으로. 받을 때 지난 주문 화면을 보여주세요.' },
  { key: 'odeng1',     id: 'odeng1', taste: null,  name: '꼬치어묵', sub: '1개',
    desc: '국물에 푹 담가 둔 꼬치어묵. 어묵 국물은 공짜로 떠 드려요.' },
];
export const productOf = (id: string, taste: Taste | null) => PRODUCTS.find((p) => p.id === id && p.taste === taste);

export function usePub(interval = 15000) {
  const [pub, setPub] = useState<Public | null>(null);
  const load = useCallback(() => food.pub().then(setPub).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, interval); return () => clearInterval(t); }, [load, interval]);
  return { pub, reload: load, price: (id: string) => pub?.menu.find((m) => m.id === id)?.price ?? 0, soldout: (id: string) => !!pub?.menu.find((m) => m.id === id)?.soldout };
}

export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2200); return () => clearTimeout(t); }, [msg]);
  return { toast: msg ? <div className="toast" role="status">{msg}</div> : null, show: setMsg };
}

export function AppBar({ title, back, cartButton }: { title: string; back?: string | true; cartButton?: boolean }) {
  const router = useRouter();
  const items = useCart();
  const n = items.reduce((s, x) => s + x.qty, 0);
  return (
    <header className="appbar">
      {back ? (
        <button aria-label="뒤로" className="icon-btn" onClick={() => (back === true ? router.back() : router.push(back))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      ) : <span style={{ width: 44 }} />}
      <h1 className="serif" style={{ margin: 0, fontSize: 19, color: 'var(--hong)' }}>{title}</h1>
      {cartButton ? (
        <Link href="/food/cart" aria-label={`장바구니 ${n}개`} className="icon-btn" style={{ position: 'relative', color: 'var(--ink)' }}>
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          {n > 0 && <span key={n} className="badge bump">{n}</span>}
        </Link>
      ) : <span style={{ width: 44 }} />}
    </header>
  );
}

export function BottomCTA({ children }: { children: React.ReactNode }) {
  return <div className="bar">{children}</div>;
}

// 주문 → 입금 → 조리 → 수령
export function Steps({ at }: { at: 0 | 1 | 2 | 3 }) {
  const labels = ['주문', '입금', '조리', '수령'];
  return (
    <ol className="steps" aria-label="진행 단계">
      {labels.map((l, i) => (
        <li key={l} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="pip">{i < at ? '✓' : i + 1}</span><span>{l}</span>
        </li>
      ))}
    </ol>
  );
}

// ───────── 음식 그림 ─────────
export function UdonArt({ spicy, size = 96 }: { spicy?: boolean; size?: number }) {
  const id = spicy ? 'sp' : 'ml';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`broth-${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor={spicy ? '#D7653C' : '#D9A363'} /><stop offset="1" stopColor={spicy ? '#9E3519' : '#A86B33'} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="62" r="54" fill="#2A211C" opacity=".12" />
      <circle cx="60" cy="58" r="54" fill="#A24027" />
      <circle cx="60" cy="58" r="50" fill="#FBFAF6" />
      <circle cx="60" cy="58" r="44" fill={`url(#broth-${id})`} />
      <g fill="none" stroke="#F6E7C4" strokeWidth="5.5" strokeLinecap="round">
        <path d="M30 52c10-8 20 8 30 0s20 8 30 0" /><path d="M28 64c10-8 22 8 32 0s22 8 32 0" /><path d="M34 76c9-7 18 7 27 0s18 7 27 0" />
        <path d="M38 42c8-6 16 6 24 0s14 5 20 0" />
      </g>
      <rect x="66" y="30" width="22" height="16" rx="3" fill="#C98E4A" transform="rotate(14 77 38)" />
      <rect x="69" y="33" width="16" height="10" rx="2" fill="none" stroke="#A86B33" strokeWidth="1.2" transform="rotate(14 77 38)" />
      <circle cx="44" cy="70" r="10" fill="#FFFDF8" /><path d="M44 70m-6 0a6 6 0 1 0 6-6a3.5 3.5 0 1 0 3.5 3.5" fill="none" stroke="#E07A93" strokeWidth="2.2" strokeLinecap="round" />
      <g fill="#E9B65A">{[[54, 40], [60, 46], [50, 50], [70, 58], [64, 66], [76, 70], [58, 78], [40, 56], [82, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.6 - (i % 3) * .5} />)}</g>
      <g fill="none" stroke="#5E9A44" strokeWidth="2.4">{[[72, 80], [80, 64], [36, 46], [62, 56]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" />)}</g>
      {spicy && <>
        <g fill="#C8241A">{[[52, 62], [66, 48], [74, 74], [46, 82], [84, 60], [58, 70]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="2" rx="1" transform={`rotate(${i * 37} ${x} ${y})`} />)}</g>
        <g>{[[64, 84], [88, 68]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="4.2" fill="#3F8A3A" /><circle cx={x} cy={y} r="2" fill="#E9F0C8" /></g>)}</g>
      </>}
    </svg>
  );
}

export function OdengArt({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="64" r="50" fill="#2A211C" opacity=".07" />
      <path d="M60 10v100" stroke="#C9A977" strokeWidth="4" strokeLinecap="round" />
      {[22, 44, 66].map((y, i) => (
        <g key={y}>
          <path d={`M30 ${y + 8}c6-10 12 10 18 0s12 10 18 0 12 10 18 0 6-6 6-6v16s-6 6-12 6-12-10-18 0-12-10-18 0-12-10-18 0z`}
            fill={i === 1 ? '#D6A35E' : '#DDB06B'} stroke="#A9773C" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={`M36 ${y + 14}c5 2 10-2 15 0`} stroke="#F3D7A2" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8" />
        </g>
      ))}
    </svg>
  );
}

export function ProductArt({ p, size }: { p: Pick<Product, 'id' | 'taste'>; size?: number }) {
  return p.id.startsWith('udon') ? <UdonArt spicy={p.taste === 'spicy'} size={size} /> : <OdengArt size={size} />;
}

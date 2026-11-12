'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INSTA, store, won } from '@/lib/food';
import { useCart } from '@/lib/cart';
import { Corners, Flourish } from './ornaments';
import { BottomCTA, UdonArt, usePub } from './ui';

export default function Landing() {
  const { pub, price } = usePub();
  const items = useCart();
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => { setLast(store.get('ef:last')); }, []);
  const n = items.reduce((s, x) => s + x.qty, 0);
  const closed = !!pub && !pub.open;
  const wait = pub ? Math.max(3, Math.ceil(pub.waiting * 1.5)) : null;

  return (
    <main className="ef page" style={{ paddingBottom: 120 }}>
      <Corners />
      <section style={{ position: 'relative', textAlign: 'center', padding: '44px 20px 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/food/mark.png" alt="어흐~동 마크" width={150} height={150} style={{ display: 'block', margin: '0 auto' }} />
        <h1 className="serif" style={{ margin: '14px 0 0', fontSize: 40, color: 'var(--hong)', letterSpacing: '-0.03em' }}>어흐~동</h1>
        <p style={{ margin: '6px 0 0', fontSize: 15.5, color: 'var(--hong2)' }}>한 번 보면 <b>어~흐</b>, 한 입 먹으면 <b>어흐어~흐</b></p>
      </section>

      {/* 가게 상태 */}
      <section style={{ padding: '24px 16px 0' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', borderRadius: 16 }}>
          <div className="stat">
            <b style={{ color: closed ? 'var(--ink3)' : 'var(--ok)', fontSize: 17, display: 'inline-flex', alignItems: 'center', gap: 6, height: 27 }}>
              <span className={`dot ${closed ? '' : 'live'}`} style={{ background: closed ? 'var(--ink3)' : 'var(--ok)' }} />{pub ? (closed ? '준비 중' : '영업 중') : '…'}
            </b><span>STadium 부스</span>
          </div>
          <span style={{ width: 1, height: 34, background: 'var(--line)' }} />
          <div className="stat"><b>{pub ? pub.waiting : '–'}<small style={{ fontSize: 13, fontWeight: 600 }}>건</small></b><span>조리 대기</span></div>
          <span style={{ width: 1, height: 34, background: 'var(--line)' }} />
          <div className="stat"><b>{wait ?? '–'}<small style={{ fontSize: 13, fontWeight: 600 }}>분</small></b><span>예상 대기</span></div>
        </div>
      </section>

      {/* 대표 메뉴 */}
      <section style={{ padding: '22px 16px 0' }}>
        <div className="section-t"><h2 className="serif">오늘의 메뉴</h2><span>현수막 그대로</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([['mild', '어흐~동', '일반맛'], ['spicy', '어흐어흐~동', '매운맛']] as const).map(([t, name, sub]) => (
            <Link key={t} href="/food/menu" className="card" style={{ textDecoration: 'none', color: 'inherit', padding: '14px 12px', textAlign: 'center', borderRadius: 16 }}>
              <UdonArt spicy={t === 'spicy'} size={104} />
              <div className="serif" style={{ fontSize: 17, marginTop: 6 }}>{name}</div>
              <div className="sub" style={{ fontSize: 13 }}>{sub} · <b className="tnum" style={{ color: 'var(--hong2)' }}>{pub ? won(price('udon')) : '…'}</b></div>
            </Link>
          ))}
        </div>
        <Link href="/food/menu" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: '14px 16px', textDecoration: 'none', color: 'inherit', borderRadius: 16 }}>
          <span><b>꼬치어묵</b> <span className="sub" style={{ fontSize: 14 }}>· {pub ? won(price('odeng1')) : '…'}</span></span>
          <span className="faint" style={{ fontSize: 13 }}>어묵 국물은 공짜 →</span>
        </Link>
      </section>

      {pub?.discount_school && (
        <section style={{ padding: '12px 16px 0' }}>
          <div className="rise" style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hongSoft)', border: '1.5px solid rgba(162,64,39,.3)', borderRadius: 14 }}>
            <span className="seal" style={{ width: 42, height: 42, fontSize: 13, lineHeight: 1.1, textAlign: 'center', transform: 'rotate(-4deg)', flexShrink: 0 }}>꼴찌<br />위로</span>
            <div style={{ fontSize: 14, lineHeight: 1.45 }}><b>지금 어흐순위 꼴찌 {pub.discount_school}</b><br /><span className="sub">우동 한 그릇당 {won(pub.discount_amount)} 할인</span></div>
          </div>
        </section>
      )}

      {/* 이벤트 */}
      <section style={{ padding: '12px 16px 0' }}>
        <div className="frame" style={{ padding: '18px 18px 16px', textAlign: 'center', borderRadius: 6 }}>
          <div className="serif" style={{ fontSize: 18, color: 'var(--hong)' }}>인스타그램 이벤트</div>
          <div style={{ margin: '8px 0 10px' }}><Flourish /></div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
            <b style={{ color: 'var(--hong)' }}>@{INSTA}</b> 태그하고 스토리에 인증샷 올리면<br />어흐~동을 <b style={{ color: 'var(--hong)' }}>어흐묵 우동</b>으로 바꿔드려요~
          </p>
        </div>
      </section>

      {last && (
        <section style={{ padding: '12px 16px 0' }}>
          <Link href={`/food/o/${last}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', color: 'inherit', borderRadius: 16 }}>
            <span className="seal" style={{ width: 34, height: 34, fontSize: 13, borderRadius: 8 }}>주문</span>
            <span style={{ flex: 1, fontWeight: 700 }}>내 주문 상태 보기</span><span className="faint">→</span>
          </Link>
        </section>
      )}

      <p className="faint" style={{ textAlign: 'center', fontSize: 12.5, margin: '20px 0 0' }}>계좌이체만 받아요 · 입금하면 자동으로 확인돼요</p>

      <BottomCTA>
        <Link href={n ? '/food/cart' : '/food/menu'} className="btn btn-hong" aria-disabled={closed}
          style={{ textDecoration: 'none', borderRadius: 14, pointerEvents: closed ? 'none' : undefined, opacity: closed ? .45 : 1 }}>
          {closed ? '지금은 주문을 받지 않아요' : n ? `장바구니 보기 · ${n}개` : '주문하러 가기'}
        </Link>
      </BottomCTA>
    </main>
  );
}

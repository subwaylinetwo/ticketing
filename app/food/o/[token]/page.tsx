'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { BOOTH } from '@/lib/config';
import { copy, food, lineName, store, won, type Order } from '@/lib/food';
import { Corners } from '../../ornaments';

export default function OrderPage() {
  const { token } = useParams<{ token: string }>();
  const [o, setO] = useState<Order | null | undefined>(undefined);
  const [toast, setToast] = useState('');
  const prev = useRef<string | null>(null);

  const load = useCallback(async () => {
    try { setO(await food.order(token)); } catch { /* 네트워크 끊김: 다음 주기에 다시 */ }
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  useEffect(() => {
    if (!o) return;
    if (prev.current && prev.current !== o.status && o.status === 'ready') {
      try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch { /* 무시 */ }
    }
    if (prev.current && prev.current === 'pending' && o.status === 'paid') {
      try { navigator.vibrate?.(150); } catch { /* 무시 */ }
    }
    prev.current = o.status;
    document.title = o.status === 'ready' ? `🔔 ${o.call_no}번 나왔어요 · 어흐~동` : o.status === 'paid' ? `${o.call_no}번 조리 중 · 어흐~동` : '어흐~동 주문서';
  }, [o]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2000); return () => clearTimeout(t); }, [toast]);

  if (o === undefined) return <main className="ef" style={{ display: 'grid', placeItems: 'center' }}><p className="sub">주문서 불러오는 중…</p></main>;
  if (o === null) return (
    <main className="ef" style={{ padding: 24, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div><p className="serif" style={{ fontSize: 24 }}>주문서를 찾을 수 없어요</p><a className="btn btn-hong" href="/food" style={{ textDecoration: 'none', marginTop: 16 }}>메뉴판으로</a></div>
    </main>
  );

  if (o.status === 'ready') return <Ready o={o} />;

  return (
    <main className="ef" style={{ paddingBottom: 40 }}>
      {toast && <div className="toast" role="status">{toast}</div>}
      <Corners size={48} />
      <nav style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 30px 0 34px' }}>
        <a href="/food" style={{ textDecoration: 'none', fontSize: 15, fontWeight: 600, color: 'var(--ink2)' }}>← 메뉴판</a>
        <span className="serif" style={{ fontSize: 20, color: 'var(--hong)' }}>어흐~동 주문서</span>
        <span style={{ width: 70 }} />
      </nav>
      {o.status === 'pending' && <Pending o={o} onToast={setToast} reload={load} />}
      {o.status === 'paid' && <Cooking o={o} />}
      {o.status === 'done' && <Done />}
      {o.status === 'cancelled' && <Cancelled />}
      <Summary o={o} />
    </main>
  );
}

function Pending({ o, onToast, reload }: { o: Order; onToast: (s: string) => void; reload: () => void }) {
  const [left, setLeft] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [name, setName] = useState(store.get('ef:name') ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, 30 * 60 - Math.floor((Date.now() - new Date(o.created_at).getTime()) / 1000)));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [o.created_at]);

  async function cp(text: string, what: string) { onToast((await copy(text)) ? `${what} 복사했어요` : '복사가 안 돼요. 길게 눌러 복사해 주세요'); }

  async function find() {
    setBusy(true); setMsg('');
    try {
      const r = await food.find(o.token, name.trim());
      setMsg({ ok: '찾았어요! 바로 끓일게요.', not_found: '아직 그 이름의 입금이 안 보여요. 1분 뒤 다시 눌러 주세요.',
        ambiguous: '같은 이름·금액 입금이 여러 개예요. 카운터에 말해 주세요.', too_many_attempts: '여러 번 실패했어요. 카운터에 말해 주세요.',
        no_pending: '이미 처리된 주문이에요.' }[r.result] ?? '카운터에 말해 주세요.');
      reload();
    } catch { setMsg('잠시 후 다시 눌러 주세요.'); }
    setBusy(false);
  }

  const acct = BOOTH.account.replace(/[^\d-]/g, '');
  return (
    <section style={{ padding: '18px 16px 0' }} className="rise">
      <h1 className="serif" style={{ fontSize: 34, margin: '0 0 4px', lineHeight: 1.2, color: 'var(--hong)' }}>입금하면<br />바로 끓여요</h1>
      <p className="sub" style={{ margin: '0 0 16px', fontSize: 15 }}>보내는 순간 이 화면이 자동으로 넘어가요.</p>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="sub" style={{ fontSize: 15 }}>보낼 금액</span>
          <button onClick={() => cp(String(o.amount), '금액을')} className="tnum" style={{ fontSize: 30, fontWeight: 800 }}>{won(o.amount)}</button>
        </div>
        <Perf />
        <div style={{ padding: '14px 18px 18px', textAlign: 'center', background: 'var(--hongSoft)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hong)' }}>받는 분 통장 표시 (입금자명)에 이 번호</div>
          <div className="tnum serif" style={{ fontSize: 64, lineHeight: 1.1, letterSpacing: '.12em', color: 'var(--hong)', margin: '6px 0 10px' }}>{o.tag}</div>
          <button className="pill btn-hong" style={{ height: 40, padding: '0 20px' }} onClick={() => cp(o.tag, '번호를')}>번호 복사</button>
        </div>
        <Perf />
        <div style={{ padding: '14px 18px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="sub" style={{ fontSize: 13 }}>{BOOTH.bank} · {BOOTH.holder}</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{BOOTH.account}</div>
          </div>
          <button className="pill btn-line" style={{ height: 40 }} onClick={() => cp(acct, '계좌번호를')}>계좌 복사</button>
        </div>
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: '16px 2px 0', display: 'grid', gap: 10, fontSize: 15, lineHeight: 1.45 }}>
        {['계좌 복사 → 은행 앱에서 금액 그대로 보내기', <>보낼 때 <b>받는 분 통장 표시</b>를 <b style={{ color: 'var(--hong)' }}>{o.tag}</b>로 바꾸기</>, '보내고 이 화면으로 돌아오기 (자동 확인)'].map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: 10 }}>
            <span className="seal tnum" style={{ width: 24, height: 24, fontSize: 14, flexShrink: 0, borderRadius: 12 }}>{i + 1}</span><span>{t}</span>
          </li>
        ))}
      </ol>

      <div className="card" style={{ marginTop: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
        <span className="dot live" style={{ background: 'var(--hong)' }} />
        <span style={{ flex: 1, fontWeight: 600 }}>입금 기다리는 중</span>
        <span className="tnum faint" style={{ fontSize: 13 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} 뒤 자동 취소</span>
      </div>

      <div style={{ marginTop: 16 }}>
        {!findOpen ? (
          <button className="btn btn-line" style={{ height: 50, fontSize: 15 }} onClick={() => setFindOpen(true)}>번호를 깜빡하고 보냈어요</button>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>보낸 사람 이름으로 찾기</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="통장에 찍히는 이름" maxLength={20} />
              <button className="btn btn-hong" style={{ width: 96, flexShrink: 0, height: 52 }} disabled={busy || name.trim().length < 2} onClick={find}>{busy ? '…' : '찾기'}</button>
            </div>
            {msg && <p style={{ margin: '10px 0 0', fontSize: 14 }} className="sub">{msg}</p>}
            <p className="faint" style={{ margin: '8px 0 0', fontSize: 13 }}>남은 시도 {o.find_attempts_left}번 · 안 되면 카운터에서 바로 확인해 드려요.</p>
          </div>
        )}
        <button className="btn" style={{ height: 46, fontSize: 14, fontWeight: 500, color: 'var(--ink3)', marginTop: 4 }}
          onClick={async () => { if (confirmCancel()) { await food.cancel(o.token).catch(() => {}); reload(); } }}>주문 취소</button>
      </div>
    </section>
  );
}

// 브라우저 confirm 대신 두 번 누르기
let armed = 0;
function confirmCancel() { const now = Date.now(); if (now - armed < 3000) return true; armed = now; alertOnce(); return false; }
function alertOnce() { const el = document.createElement('div'); el.className = 'toast'; el.textContent = '한 번 더 누르면 취소돼요'; document.querySelector('.ef')?.appendChild(el); setTimeout(() => el.remove(), 2200); }

function Cooking({ o }: { o: Order }) {
  return (
    <section style={{ padding: '28px 16px 0', textAlign: 'center' }} className="rise">
      <p className="sub" style={{ margin: 0, fontWeight: 600 }}>입금 확인됐어요</p>
      <div className="seal stamp" style={{ width: 168, height: 168, margin: '18px auto 12px', borderRadius: 18, flexDirection: 'column', boxShadow: 'inset 0 0 0 4px rgba(255,244,232,.35), 0 18px 30px -18px rgba(124,14,17,.9)' }}>
        <span style={{ fontSize: 16, opacity: .85 }}>호출번호</span>
        <span className="tnum" style={{ fontSize: 76, lineHeight: 1 }}>{o.call_no}</span>
      </div>
      <h1 className="serif" style={{ fontSize: 28, margin: '8px 0 6px' }}>지금 끓이는 중</h1>
      <p className="sub" style={{ margin: 0, fontSize: 16 }}>{o.ahead ? <>앞에 <b style={{ color: 'var(--ink)' }}>{o.ahead}개</b> 주문이 있어요</> : '바로 다음 차례예요'}</p>
      <div className="card" style={{ margin: '20px 0 0', padding: 14, fontSize: 14, lineHeight: 1.5, textAlign: 'left', display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <span className="sub">다 되면 <b style={{ color: 'var(--ink)' }}>이 화면이 빨갛게 바뀌고 진동</b>이 와요. 화면을 켜 두거나 가끔 열어 봐 주세요.</span>
      </div>
    </section>
  );
}

function Ready({ o }: { o: Order }) {
  return (
    <main className="ef" style={{ background: 'var(--hong)', color: '#FFF6EC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, opacity: .85 }}>어흐어~흐, 나왔소!</p>
      <div className="tnum serif stamp" style={{ fontSize: 150, lineHeight: 1, margin: '14px 0 4px', width: 240, height: 240, borderRadius: 120, display: 'grid', placeItems: 'center', border: '4px solid rgba(255,246,236,.6)', animation: 'efStamp .5s cubic-bezier(.2,1.4,.4,1) both, efPulse 1.6s ease-in-out .5s infinite' }}>{o.call_no}</div>
      <h1 className="serif" style={{ fontSize: 34, margin: '18px 0 8px' }}>받으러 오세요</h1>
      <p style={{ margin: 0, fontSize: 16, opacity: .85 }}>카운터에서 이 화면을 보여주세요.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', fontSize: 15, opacity: .9 }}>
        {o.items.map((l, i) => <li key={i}>{lineName(l)} × {l.qty}</li>)}
      </ul>
    </main>
  );
}

function Done() {
  return (
    <section style={{ padding: '32px 16px 0', textAlign: 'center' }} className="rise">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/food/char.jpg" alt="" width={150} height={225} style={{ mixBlendMode: 'multiply', display: 'block', margin: '0 auto', objectFit: 'contain' }} />
      <h1 className="serif" style={{ fontSize: 30, margin: '10px 0 6px' }}>맛있게 드세요, 어흐어흐</h1>
      <p className="sub" style={{ margin: 0, lineHeight: 1.5 }}><b style={{ color: 'var(--hong)' }}>@uh_heu_dong</b> 태그하고 스토리에 인증샷 올리면<br />다음엔 <b style={{ color: 'var(--hong)' }}>어흐묵 우동</b>으로 바꿔드려요~</p>
      <a className="btn btn-hong" href="/food" style={{ textDecoration: 'none', marginTop: 20 }}>한 그릇 더 시키기</a>
    </section>
  );
}

function Cancelled() {
  return (
    <section style={{ padding: '32px 16px 0', textAlign: 'center' }} className="rise">
      <span className="seal" style={{ fontSize: 22, padding: '8px 16px', transform: 'rotate(-4deg)' }}>취소됨</span>
      <h1 className="serif" style={{ fontSize: 26, margin: '18px 0 6px' }}>이 주문은 취소됐어요</h1>
      <p className="sub" style={{ margin: 0, lineHeight: 1.5 }}>30분 안에 입금이 확인되지 않으면 자동으로 취소돼요.<br /><b style={{ color: 'var(--ink)' }}>이미 보냈다면 카운터에 말해 주세요.</b></p>
      <a className="btn btn-hong" href="/food" style={{ textDecoration: 'none', marginTop: 20 }}>다시 주문하기</a>
    </section>
  );
}

function Summary({ o }: { o: Order }) {
  return (
    <section style={{ padding: '24px 16px 0' }}>
      <div className="card" style={{ padding: '6px 16px' }}>
        {o.items.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: 15 }}>
            <span>{lineName(l)} <span className="faint">× {l.qty}</span></span><span className="tnum">{won(l.price * l.qty)}</span>
          </div>
        ))}
        {o.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 15, color: 'var(--hong)' }}>
            <span>꼴찌 위로 할인 ({o.school})</span><span className="tnum">−{won(o.discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontWeight: 800 }}>
          <span>합계</span><span className="tnum">{won(o.amount)}</span>
        </div>
      </div>
    </section>
  );
}

function Perf() {
  return (
    <div style={{ position: 'relative', height: 0 }}>
      <div className="dash" style={{ margin: '0 14px' }} />
      <span style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: 9, background: 'var(--paper)', borderRight: '1px solid var(--line)' }} />
      <span style={{ position: 'absolute', right: -9, top: -9, width: 18, height: 18, borderRadius: 9, background: 'var(--paper)', borderLeft: '1px solid var(--line)' }} />
    </div>
  );
}

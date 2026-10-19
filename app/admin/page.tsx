'use client';
// 부스 운영진용. 폰으로 쓰는 걸 전제로 버튼을 크게, 되돌리기 어려운 건 한 번 더 묻는다.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { photoUrls } from '@/lib/api';

type Overview = { pending_payments: number; open_deposits: number; open_reports: number;
  active_users: number; hidden_users: number; matches: number; revenue: number };
type Payment = { id: number; kind: 'join' | 'hearts'; hearts: number; amount: number; tag: string;
  created_at: string; find_attempts: number; user_id: string; nickname: string; school: string; photo: string };
type Deposit = { id: number; name: string; amount: number; received_at: string; status: string; raw: string;
  candidates: { payment_id: number; tag: string; nickname: string; school: string; tag_match: boolean }[] };
type ReportGroup = { target_id: string; nickname: string; school: string; photos: string[]; intro: string | null;
  status: string; hidden_reason: string | null; count: number;
  items: { reason: string; detail: string | null; at: string; reporter: string; reporter_school: string }[] };
type User = { id: string; nickname: string; school: string; gender: string; photo: string; status: string;
  hidden_reason: string | null; hearts: number; tag: string; email: string; reports: number;
  pending: null | { id: number; kind: string; amount: number } };

const REASON: Record<string, string> = { photo: '사진', rude: '불쾌한 말', fake: '가짜 프로필', spam: '광고', minor: '미성년 의심', other: '기타' };
const won = (n: number) => n.toLocaleString('ko-KR') + '원';
const time = (s: string) => new Date(s).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) { alert('실패: ' + error.message); throw error; }
  return data as T;
}

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'pay' | 'report' | 'user'>('pay');
  const [ov, setOv] = useState<Overview | null>(null);

  const refreshOv = useCallback(async () => setOv(await rpc<Overview>('admin_overview')), []);

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => setAllowed(!!data));
  }, []);
  useEffect(() => {
    if (!allowed) return;
    refreshOv();
    const t = setInterval(refreshOv, 5000);
    return () => clearInterval(t);
  }, [allowed, refreshOv]);

  if (allowed === null) return <main style={S.page}>확인 중…</main>;
  if (!allowed) return <main style={S.page}>운영진 계정으로 로그인해 주세요.</main>;

  return (
    <main style={S.page}>
      <h1 style={{ fontSize: 24, margin: '8px 0 12px' }}>운영진</h1>
      {ov && (
        <div style={S.stats}>
          <Stat label="가입" value={ov.active_users} />
          <Stat label="매칭" value={ov.matches} />
          <Stat label="숨김" value={ov.hidden_users} />
          <Stat label="매출" value={won(ov.revenue)} />
        </div>
      )}
      <nav style={S.tabs}>
        <TabBtn on={tab === 'pay'} onClick={() => setTab('pay')} badge={(ov?.pending_payments ?? 0) + (ov?.open_deposits ?? 0)}>입금</TabBtn>
        <TabBtn on={tab === 'report'} onClick={() => setTab('report')} badge={ov?.open_reports ?? 0} urgent>신고</TabBtn>
        <TabBtn on={tab === 'user'} onClick={() => setTab('user')}>사용자</TabBtn>
      </nav>
      {tab === 'pay' && <PayTab onChange={refreshOv} tick={ov} />}
      {tab === 'report' && <ReportTab onChange={refreshOv} tick={ov} />}
      {tab === 'user' && <UserTab onChange={refreshOv} />}
    </main>
  );
}

// ── 입금 ─────────────────────────────────────────────────────
function PayTab({ onChange, tick }: { onChange: () => void; tick: Overview | null }) {
  const [q, setQ] = useState('');
  const [pays, setPays] = useState<Payment[]>([]);
  const [deps, setDeps] = useState<Deposit[]>([]);
  const load = useCallback(async () => {
    const [p, d] = await Promise.all([rpc<Payment[]>('admin_payments', { q }), rpc<Deposit[]>('admin_deposits')]);
    setPays(p); setDeps(d);
  }, [q]);
  // 숫자가 바뀌면 목록도 새로
  useEffect(() => { load(); }, [load, tick?.pending_payments, tick?.open_deposits]);

  const cash = async (p: Payment) => {
    if (!confirm(`${p.nickname}(${p.tag}) ${won(p.amount)} 현금 받았나요?`)) return;
    await rpc('admin_approve_payment', { payment_id: p.id, deposit_id: null, method: 'cash' });
    load(); onChange();
  };
  const link = async (d: Deposit, c: Deposit['candidates'][number]) => {
    if (!confirm(`입금 "${d.name}" ${won(d.amount)} → ${c.nickname}(${c.tag}) 로 승인할까요?`)) return;
    await rpc('admin_approve_payment', { payment_id: c.payment_id, deposit_id: d.id, method: 'transfer' });
    load(); onChange();
  };
  const ignore = async (d: Deposit) => {
    if (!confirm(`"${d.name}" ${won(d.amount)} 입금을 목록에서 뺄까요? (환불 처리한 경우 등)`)) return;
    await rpc('admin_ignore_deposit', { deposit_id: d.id });
    load(); onChange();
  };

  return (
    <>
      <h2 style={S.h2}>확인 못 한 입금 {deps.length > 0 && <b style={S.red}>{deps.length}</b>}</h2>
      {deps.length === 0 && <p style={S.empty}>없어요. 입금은 자동으로 승인되고 있어요.</p>}
      {deps.map((d) => (
        <div key={d.id} style={S.card}>
          <div style={S.row}>
            <b style={{ fontSize: 18 }}>{d.name || '(이름 못 읽음)'}</b>
            <span>{won(d.amount)} · {time(d.received_at)}</span>
          </div>
          <div style={S.sub}>{d.status === 'ambiguous' ? '뒷자리가 같은 사람이 여럿이에요' : '맞는 결제를 못 찾았어요'} · {d.raw}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {d.candidates.slice(0, 6).map((c) => (
              <button key={c.payment_id} style={c.tag_match ? S.btnDark : S.btn} onClick={() => link(d, c)}>
                {c.nickname} · {c.school} · {c.tag}
              </button>
            ))}
            <button style={S.btnGhost} onClick={() => ignore(d)}>목록에서 빼기</button>
          </div>
        </div>
      ))}

      <h2 style={S.h2}>결제 대기</h2>
      <input style={S.input} inputMode="numeric" placeholder="전화번호 뒷자리 또는 닉네임" value={q} onChange={(e) => setQ(e.target.value)} />
      {pays.length === 0 && <p style={S.empty}>대기 중인 결제가 없어요.</p>}
      {pays.map((p) => (
        <div key={p.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div><b>{p.nickname}</b> · {p.school} · <b style={{ fontSize: 18 }}>{p.tag}</b></div>
            <div style={S.sub}>{p.kind === 'join' ? '가입비' : `하트 ${p.hearts}개`} {won(p.amount)} · {time(p.created_at)}
              {p.find_attempts > 0 && ` · 이름으로 찾기 ${p.find_attempts}번 실패`}</div>
          </div>
          <button style={S.btnDark} onClick={() => cash(p)}>현금 받음</button>
        </div>
      ))}
    </>
  );
}

// ── 신고 ─────────────────────────────────────────────────────
function ReportTab({ onChange, tick }: { onChange: () => void; tick: Overview | null }) {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const g = await rpc<ReportGroup[]>('admin_reports');
    setGroups(g);
    setUrls(await photoUrls(g.flatMap((x) => x.photos)));
  }, []);
  useEffect(() => { load(); }, [load, tick?.open_reports]);

  const hide = async (g: ReportGroup) => {
    if (!confirm(`${g.nickname} 님을 숨길까요? 둘러보기·하트 목록에서 사라져요.`)) return;
    await rpc('admin_set_hidden', { user_id: g.target_id, hide: true, reason: 'reports' });
    load(); onChange();
  };
  const clear = async (g: ReportGroup) => {
    if (!confirm(`문제없음으로 닫을까요?${g.status === 'hidden' ? ' 자동 숨김도 풀려요.' : ''}`)) return;
    await rpc('admin_set_hidden', { user_id: g.target_id, hide: false });
    load(); onChange();
  };

  if (groups.length === 0) return <p style={S.empty}>열린 신고가 없어요.</p>;
  return (
    <>
      {groups.map((g) => (
        <div key={g.target_id} style={S.card}>
          <div style={S.row}>
            <b style={{ fontSize: 18 }}>{g.nickname} · {g.school}</b>
            <span style={S.red}>신고 {g.count}{g.status === 'hidden' ? ' · 자동 숨김됨' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
            {g.photos.map((p) => urls[p]
              ? <img key={p} src={urls[p]} alt="" style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 10 }} />
              : <div key={p} style={{ width: 96, height: 128, borderRadius: 10, background: '#eee' }} />)}
          </div>
          {g.intro && <div style={S.sub}>소개: {g.intro}</div>}
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {g.items.map((it, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <b>{REASON[it.reason] ?? it.reason}</b> {it.detail && `— ${it.detail}`}
                <span style={S.sub}> ({it.reporter}·{it.reporter_school}, {time(it.at)})</span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btnDark, flex: 1, background: '#D93025' }} onClick={() => hide(g)}>숨기기</button>
            <button style={{ ...S.btn, flex: 1 }} onClick={() => clear(g)}>문제없음</button>
          </div>
        </div>
      ))}
    </>
  );
}

// ── 사용자 ───────────────────────────────────────────────────
function UserTab({ onChange }: { onChange: () => void }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const search = useCallback(async () => setUsers(await rpc<User[]>('admin_users', { q })), [q]);
  useEffect(() => { const t = setTimeout(search, 300); return () => clearTimeout(t); }, [search]);

  const grant = async (u: User, n: number, free: boolean) => {
    const amount = free ? 0 : n * 500;
    if (!confirm(`${u.nickname} 님에게 하트 ${n}개 ${free ? '무료로' : won(amount) + ' 현금 받고'} 줄까요?`)) return;
    await rpc('admin_grant_hearts', { user_id: u.id, n, amount });
    search(); onChange();
  };
  const toggleHide = async (u: User) => {
    const hide = u.status !== 'hidden';
    if (!confirm(hide ? `${u.nickname} 님을 숨길까요?` : `${u.nickname} 님 숨김을 풀까요?`)) return;
    await rpc('admin_set_hidden', { user_id: u.id, hide, reason: hide ? 'admin' : null });
    search(); onChange();
  };
  const approveJoin = async (u: User) => {
    if (!u.pending || !confirm(`${u.nickname}(${u.tag}) ${won(u.pending.amount)} 현금 받았나요?`)) return;
    await rpc('admin_approve_payment', { payment_id: u.pending.id, deposit_id: null, method: 'cash' });
    search(); onChange();
  };

  return (
    <>
      <input style={S.input} placeholder="닉네임 · 뒷자리 · 메일" value={q} onChange={(e) => setQ(e.target.value)} />
      {users.map((u) => (
        <div key={u.id} style={S.card}>
          <div style={S.row}>
            <b style={{ fontSize: 18 }}>{u.nickname} · {u.school} · {u.tag}</b>
            <span style={u.status === 'hidden' ? S.red : S.sub}>
              {u.status === 'active' ? '이용 중' : u.status === 'pending' ? '가입비 대기' : '숨김'}
            </span>
          </div>
          <div style={S.sub}>{u.email} · 하트 {u.hearts}개{u.reports > 0 && ` · 열린 신고 ${u.reports}`}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {u.pending && <button style={S.btnDark} onClick={approveJoin.bind(null, u)}>
              {u.pending.kind === 'join' ? '가입비' : '하트'} {won(u.pending.amount)} 현금 받음</button>}
            {u.status === 'active' && [1, 3, 5].map((n) => (
              <button key={n} style={S.btn} onClick={() => grant(u, n, false)}>하트 {n} ({won(n * 500)})</button>))}
            {u.status === 'active' && <button style={S.btnGhost} onClick={() => grant(u, 1, true)}>무료 1개</button>}
            <button style={S.btnGhost} onClick={() => toggleHide(u)}>{u.status === 'hidden' ? '숨김 풀기' : '숨기기'}</button>
          </div>
        </div>
      ))}
    </>
  );
}

// ── 작은 부품과 스타일 ───────────────────────────────────────
function Stat({ label, value }: { label: string; value: number | string }) {
  return <div style={S.stat}><div style={S.sub}>{label}</div><b style={{ fontSize: 20 }}>{value}</b></div>;
}
function TabBtn({ on, onClick, badge, urgent, children }:
  { on: boolean; onClick: () => void; badge?: number; urgent?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...S.tab, ...(on ? S.tabOn : {}) }}>
      {children}
      {!!badge && <span style={{ ...S.badge, background: urgent ? '#D93025' : '#111' }}>{badge}</span>}
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 560, margin: '0 auto', padding: '12px 14px 80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', background: '#F2F2F7', minHeight: '100vh' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 },
  stat: { background: '#fff', borderRadius: 12, padding: '10px 12px' },
  tabs: { display: 'flex', gap: 6, position: 'sticky', top: 0, background: '#F2F2F7', padding: '6px 0', zIndex: 2 },
  tab: { flex: 1, height: 48, border: 0, borderRadius: 12, background: '#fff', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabOn: { background: '#111', color: '#fff' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, color: '#fff', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' },
  h2: { fontSize: 16, margin: '20px 4px 8px', display: 'flex', gap: 8, alignItems: 'center' },
  card: { background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  sub: { fontSize: 14, color: '#555' },
  red: { color: '#D93025', fontWeight: 700 },
  empty: { color: '#555', padding: '8px 4px' },
  input: { width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 12, border: '1px solid #ccc', padding: '0 14px', fontSize: 17, marginBottom: 10 },
  btn: { minHeight: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #ccc', background: '#fff', fontSize: 15, fontWeight: 600 },
  btnDark: { minHeight: 44, padding: '0 14px', borderRadius: 10, border: 0, background: '#111', color: '#fff', fontSize: 15, fontWeight: 600 },
  btnGhost: { minHeight: 44, padding: '0 12px', borderRadius: 10, border: 0, background: 'transparent', color: '#555', fontSize: 15, textDecoration: 'underline' },
};

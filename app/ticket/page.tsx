'use client';
// 내 티켓 만들기 4단계. ?edit=1&step=N 으로 들어오면 고치기 모드 (저장 후 내 티켓으로)
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, ApiError, uploadPhoto, type ContactType, type ProfileInput, type School } from '@/lib/api';
import { homeFor, usePhotoUrls } from '@/lib/useMe';
import { schoolOf, SCHOOLS } from '@/lib/school';
import { INTERESTS, PERSONALITY, WANTS } from '@/lib/tags';
import { C, Card, Chip, ErrorText, FootBar, Icon, InkButton, Label, Loading, Note, Row, Screen, SchoolLogo, Spinner, Title, Toggle, TopBar } from '@/components/ui';

type Form = {
  school: School | ''; photos: (string | null)[]; nickname: string; birth_year: string; height: string; gender: 'M' | 'F' | ''; spec: string;
  personality: string[]; interests: string[]; intro: string;
  ideal_personality: string[]; wants: string[];
  contact_type: ContactType; contact: string; phone: string; other_school_only: boolean; adult: boolean; agreed: boolean;
};
const EMPTY: Form = {
  school: '', photos: [null, null, null], nickname: '', birth_year: '', height: '', gender: '', spec: '',
  personality: [], interests: [], intro: '', ideal_personality: [], wants: [],
  contact_type: 'instagram', contact: '', phone: '', other_school_only: true, adult: false, agreed: false,
};
const DRAFT = 'ticketing-draft';
const MAX_YEAR = new Date().getFullYear() - 19;

export default function TicketPage() {
  return <Suspense fallback={<Loading />}><Ticket /></Suspense>;
}

function Ticket() {
  const router = useRouter();
  const sp = useSearchParams();
  const edit = sp.get('edit') === '1';
  const [step, setStep] = useState(Math.min(4, Math.max(1, Number(sp.get('step')) || 1)));
  const [f, setF] = useState<Form>(EMPTY);
  const [school, setSchool] = useState<School | null>(null);   // 학교 메일로 확인된 학교 (익명이면 null)
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const signed = usePhotoUrls(f.photos);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/start');
      setSchool(schoolOf(session.user.email ?? ''));
      const st = await api.myState();
      if (edit) {
        if (st.status === 'no_profile') return router.replace('/ticket');
        const p = await api.myProfile();
        if (p) setF({ ...EMPTY, ...p, school: p.school, photos: [0, 1, 2].map((i) => p.photos[i] ?? null), birth_year: String(p.birth_year),
          height: p.height ? String(p.height) : '', intro: p.intro ?? '', spec: p.spec ?? '', phone: '', adult: true, agreed: true,
          gender: p.gender, contact_type: p.contact_type });
      } else {
        if (st.status !== 'no_profile') return router.replace(homeFor(st));
        try { const d = localStorage.getItem(DRAFT); if (d) setF({ ...EMPTY, ...JSON.parse(d) }); } catch {}
      }
      setReady(true);
    })().catch(() => router.replace('/start'));
  }, [edit, router]);

  // 새로고침해도 쓰던 내용이 남도록 (고치기 모드는 제외)
  useEffect(() => {
    if (!ready || edit) return;
    try { localStorage.setItem(DRAFT, JSON.stringify(f)); } catch {}
  }, [f, ready, edit]);

  const age = Number(f.birth_year);
  const ok1 = (school || edit || f.school) && f.photos[0] && f.nickname.trim().length >= 1 && f.nickname.trim().length <= 12 && f.gender
    && /^\d{4}$/.test(f.birth_year) && age >= 1960 && age <= MAX_YEAR && (!f.height || (+f.height >= 140 && +f.height <= 210));
  const phoneDigits = f.phone.replace(/\D/g, '');
  const contactOk = f.contact_type === 'instagram' ? /^@?[A-Za-z0-9._]{3,30}$/.test(f.contact.trim()) : f.contact.replace(/\D/g, '').length >= 10;
  const ok4 = contactOk && (edit ? (!f.phone || phoneDigits.length >= 10) : phoneDigits.length >= 10) && f.adult && f.agreed;

  async function onPick(i: number, file: File | undefined) {
    if (!file) return;
    setErr(''); setUploading(i);
    try {
      const path = await uploadPhoto(file, (i + 1) as 1 | 2 | 3);
      setPreviews((p) => ({ ...p, [path]: URL.createObjectURL(file) }));
      setF((x) => { const photos = [...x.photos]; photos[i] = path; return { ...x, photos }; });
    } catch { setErr('사진을 올리지 못했어요. 다시 시도해 주세요.'); }
    setUploading(null);
  }

  async function save() {
    setBusy(true); setErr('');
    const input: ProfileInput = {
      gender: f.gender as 'M' | 'F', nickname: f.nickname.trim(), birth_year: age, height: f.height ? +f.height : null,
      photos: f.photos.filter(Boolean) as string[], intro: f.intro.trim(), spec: f.spec.trim(),
      personality: f.personality, interests: f.interests, ideal_personality: f.ideal_personality, wants: f.wants,
      contact_type: f.contact_type, contact: f.contact_type === 'phone' ? f.contact.replace(/[^\d-]/g, '') : f.contact.trim(),
      phone: f.phone, other_school_only: f.other_school_only, agreed: true,
      ...(school || edit || !f.school ? {} : { school: f.school }),
    };
    try {
      const st = await api.saveProfile(input);
      try { localStorage.removeItem(DRAFT); } catch {}
      router.replace(edit ? '/me' : homeFor(st));
    } catch (e) { setErr(e instanceof ApiError ? e.message : '저장하지 못했어요.'); setBusy(false); }
  }

  if (!ready) return <Loading />;
  const next = () => { setErr(''); if (edit) return save(); if (step < 4) { setStep(step + 1); window.scrollTo(0, 0); } else save(); };
  const back = () => { if (edit) return router.push('/me'); if (step > 1) setStep(step - 1); else router.push('/start'); };
  const canNext = step === 1 ? !!ok1 : step === 4 ? ok4 : true;
  const btn = edit ? '저장' : step === 4 ? '티켓 발급하기' : '다음';

  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back={back} right={!edit && <span className="tnum" style={{ fontSize: 15, fontWeight: 600, color: C.sub }}>{step} / 4</span>} />
        <Title>{edit ? ['사진과 기본 정보', '나는 이런 사람이에요', '이런 사람이 좋아요', '연락처'][step - 1]
          : ['내 티켓 만들기', '나는 이런 사람이에요', '이런 사람이 좋아요', '연락처와 동의'][step - 1]}</Title>
        {!edit && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, marginTop: 12 }}>
          {[0, 1, 2, 3].map((k) => <span key={k} style={{ height: 4, borderRadius: 2, background: k < step ? C.ink : '#D1D1D6', transition: 'background .3s' }} />)}</div>}
      </div>

      {step === 1 && <Step1 f={f} set={set} school={school} edit={edit} onPick={onPick} uploading={uploading}
        urls={{ ...signed, ...previews }} />}
      {step === 2 && <>
        <Chips label="성격" items={PERSONALITY} picked={f.personality} limit={3} onChange={(v) => set('personality', v)} />
        <Chips label="요즘 빠져 있는 것" items={INTERESTS} picked={f.interests} limit={3} onChange={(v) => set('interests', v)} />
        <Label right={<span className="tnum">{f.intro.length} / 40</span>}><label htmlFor="intro">한 줄 소개 (선택)</label></Label>
        <Card style={{ padding: '0 16px' }}>
          <input id="intro" maxLength={40} value={f.intro} onChange={(e) => set('intro', e.target.value)} placeholder="예) 탁구 동아리, 오늘 응원하러 왔어요"
            style={{ width: '100%', height: 52, border: 0, background: 'transparent', fontSize: 17 }} /></Card>
      </>}
      {step === 3 && <>
        <Chips label="끌리는 성격" items={PERSONALITY} picked={f.ideal_personality} limit={3} onChange={(v) => set('ideal_personality', v)} />
        <Chips label="만나면 하고 싶은 것" items={WANTS} picked={f.wants} limit={2} onChange={(v) => set('wants', v)} />
        <div style={{ margin: '22px 16px 0', ...C.card, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: C.orange, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h18M7 12h10M10 18h4" /></svg></span>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: C.ink2 }}>고른 내용과 잘 맞는 사람을 <b style={{ color: C.ink }}>먼저</b> 보여 드려요.</span>
        </div>
      </>}
      {step === 4 && <Step4 f={f} set={set} edit={edit} />}

      <ErrorText>{err}</ErrorText>
      <FootBar><InkButton onClick={next} disabled={!canNext} busy={busy}>{btn}</InkButton></FootBar>
    </Screen>
  );
}

function Step1({ f, set, school, edit, onPick, uploading, urls }: {
  f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; school: School | null; edit: boolean;
  onPick: (i: number, file: File | undefined) => void; uploading: number | null; urls: Record<string, string>;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const main = f.photos[0] ? urls[f.photos[0]] : undefined;
  return <>
    {/* 미리보기 티켓 */}
    <div style={{ margin: '16px 16px 0', height: 92, borderRadius: 22, background: 'linear-gradient(160deg, #2C2C2E 0%, #141416 100%)', color: '#FFFFFF', position: 'relative',
      boxShadow: '0 14px 30px -14px rgba(0,0,0,0.55)' }}>
      <div style={{ position: 'absolute', left: 14, top: 12, right: 96 }}>
        <span style={{ height: 24, padding: '0 9px 0 3px', borderRadius: 12, background: 'rgba(255,255,255,0.14)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
          <SchoolLogo school={(school || f.school || undefined) as School | undefined} />{school || f.school || '학교'}</span>
        {school && <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>✓ 학교 메일 확인됨</span>}
        <div style={{ marginTop: 6, fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nickname || '닉네임'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{f.gender ? (f.gender === 'M' ? '남' : '여') + ', ' : ''}{f.birth_year ? f.birth_year + '년생' : ''}</div>
      </div>
      <div style={{ position: 'absolute', right: 82, top: 12, bottom: 12, borderLeft: '1.5px dashed rgba(255,255,255,0.22)' }} />
      <div style={{ position: 'absolute', right: 12, top: 12, width: 60, height: 68, borderRadius: 12, overflow: 'hidden', background: '#3A3A3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {main ? <img src={main} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="image" size={22} color="rgba(255,255,255,0.5)" />}</div>
    </div>

    {!school && !edit && <>
      <Label>학교</Label>
      <div role="radiogroup" aria-label="학교" style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {SCHOOLS.map((s) => (
          <button key={s} role="radio" aria-checked={f.school === s} onClick={() => set('school', s)}
            style={{ height: 48, borderRadius: 14, border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600,
              ...(f.school === s ? { background: C.inkGrad, color: '#FFFFFF' } : { background: '#FFFFFF', color: C.ink, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.05)' }) }}>
            <SchoolLogo size={18} school={s} />{s}</button>))}
      </div>
      <Note>학교는 가입 후 바꿀 수 없어요. 부스에서 학생증을 확인할 수 있어요.</Note>
    </>}

    <Label>사진</Label>
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {[0, 1, 2].map((i) => {
        const path = f.photos[i]; const url = path ? urls[path] : undefined;
        return (
          <div key={i} style={{ position: 'relative', aspectRatio: '1 / 1.12', borderRadius: 16, overflow: 'hidden',
            background: i === 0 ? '#FFFFFF' : '#E5E5EA', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)' }}>
            <button onClick={() => inputs.current[i]?.click()} aria-label={i === 0 ? '대표 사진 고르기' : `사진 ${i + 1} 고르기`}
              style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.ink, fontSize: 14, fontWeight: 600 }}>
              {url ? <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : uploading === i ? <Spinner /> : <>
                  <span style={{ width: 32, height: 32, borderRadius: 16, background: i === 0 ? C.ink : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={i === 0 ? 18 : 24} color={i === 0 ? '#FFFFFF' : '#8E8E93'} stroke={2.4} /></span>
                  {i === 0 && '대표 사진'}</>}
            </button>
            {path && i > 0 && <button aria-label="사진 빼기" onClick={() => { const p = [...f.photos]; p[i] = null; set('photos', p); }}
              style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, border: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="close" size={12} color="#FFFFFF" stroke={3} /></button>}
            <input ref={(el) => { inputs.current[i] = el; }} type="file" accept="image/*" hidden onChange={(e) => { onPick(i, e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        );
      })}
    </div>
    <Note>얼굴이 잘 보이는 본인 사진이어야 해요. 다른 사람 사진은 신고되면 숨겨져요.</Note>

    <Label>기본 정보</Label>
    <Card>
      <Field label="닉네임"><input value={f.nickname} maxLength={12} onChange={(e) => set('nickname', e.target.value)} placeholder="12자 이내" style={INPUT} /></Field>
      <Field label="출생연도"><input value={f.birth_year} inputMode="numeric" maxLength={4} onChange={(e) => set('birth_year', e.target.value.replace(/\D/g, ''))} placeholder="2004" style={INPUT} className="tnum" /></Field>
      <Field label={<>키 <span style={{ color: C.sub }}>(선택)</span></>}>
        <input value={f.height} inputMode="numeric" maxLength={3} onChange={(e) => set('height', e.target.value.replace(/\D/g, ''))} style={{ ...INPUT, flex: '0 0 60px', width: 60 }} className="tnum" />
        <span style={{ color: C.sub, fontSize: 17 }}>cm</span></Field>
      <Field label={<>한 줄 스펙 <span style={{ color: C.sub }}>(선택)</span></>}>
        <input value={f.spec} maxLength={30} onChange={(e) => set('spec', e.target.value)} placeholder="전산학부 3학년, 탁구 동아리" style={INPUT} /></Field>
      <Field label="성별" last group>
        <div role="radiogroup" aria-label="성별" style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'rgba(118,118,128,0.12)', opacity: edit ? 0.5 : 1 }}>
          {(['M', 'F'] as const).map((g) => (
            <button key={g} role="radio" aria-checked={f.gender === g} disabled={edit} onClick={() => set('gender', g)}
              style={{ width: 60, height: 32, border: 0, borderRadius: 7, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                background: f.gender === g ? '#FFFFFF' : 'transparent', boxShadow: f.gender === g ? '0 3px 8px rgba(0,0,0,0.12)' : 'none' }}>{g === 'M' ? '남' : '여'}</button>))}
        </div></Field>
    </Card>
    <Note>{edit ? '성별은 바꿀 수 없어요.' : `성별은 가입 후 바꿀 수 없어요. ${MAX_YEAR}년생까지 참여할 수 있어요.`}</Note>
  </>;
}

const INPUT: React.CSSProperties = { flex: 1, minWidth: 0, width: '100%', height: 50, border: 0, background: 'transparent', fontSize: 17, textAlign: 'right' };
function Field({ label, children, last, group }: { label: React.ReactNode; children: React.ReactNode; last?: boolean; group?: boolean }) {
  const Tag = group ? 'div' : 'label';
  return <Tag style={{ minHeight: 52, display: 'flex', alignItems: 'center', gap: 12, paddingRight: 14, borderBottom: last ? 0 : C.sep, fontSize: 17 }}>
    <span style={{ flexShrink: 0 }}>{label}</span><span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>{children}</span></Tag>;
}

function Chips({ label, items, picked, limit, onChange }: { label: string; items: string[]; picked: string[]; limit: number; onChange: (v: string[]) => void }) {
  const toggle = (it: string) => {
    if (picked.includes(it)) onChange(picked.filter((x) => x !== it));
    else if (picked.length < limit) onChange([...picked, it]);
    else onChange([...picked.slice(1), it]);   // 한도 넘으면 가장 먼저 고른 걸 빼고 새로 넣음
  };
  return <>
    <Label right={<span className="tnum">{picked.length} / {limit}</span>}>{label}</Label>
    <div role="group" aria-label={label} style={{ margin: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => <Chip key={it} on={picked.includes(it)} onClick={() => toggle(it)}>{it}</Chip>)}
    </div>
  </>;
}

function Step4({ f, set, edit }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; edit: boolean }) {
  const [more, setMore] = useState(false);
  const placeholder = useMemo(() => (f.contact_type === 'instagram' ? '@instagram_id' : '010-0000-0000'), [f.contact_type]);
  return <>
    <Label>매칭되면 보여 줄 연락처</Label>
    <Card style={{ padding: 8 }}>
      <div style={{ display: 'flex', padding: 2, borderRadius: 10, background: 'rgba(118,118,128,0.12)' }}>
        {(['instagram', 'phone'] as const).map((t) => (
          <button key={t} onClick={() => { set('contact_type', t); set('contact', ''); }}
            style={{ flex: 1, height: 36, border: 0, borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              background: f.contact_type === t ? '#FFFFFF' : 'transparent', boxShadow: f.contact_type === t ? '0 3px 8px rgba(0,0,0,0.12)' : 'none' }}>
            {t === 'instagram' ? '인스타그램' : '전화번호'}</button>))}
      </div>
      <input aria-label="연락처" value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder={placeholder}
        inputMode={f.contact_type === 'phone' ? 'tel' : 'text'} autoCapitalize="none" autoCorrect="off"
        style={{ width: '100%', height: 50, border: 0, background: 'transparent', fontSize: 18, fontWeight: 500, padding: '0 8px' }} />
    </Card>
    <Note>서로 하트를 보낸 사람에게만 보여요.</Note>

    <Card style={{ marginTop: 20 }}>
      <label style={{ minHeight: 52, display: 'flex', alignItems: 'center', gap: 12, paddingRight: 14, fontSize: 17 }}>
        <span style={{ flexShrink: 0 }}>전화번호</span>
        <input value={f.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} placeholder={edit ? '바꿀 때만 입력' : '010-1234-5678'}
          className="tnum" style={{ ...INPUT, fontSize: 18 }} /></label>
    </Card>
    <Note>입금 확인에만 써요. 뒷자리 4개만 저장하고 아무에게도 보여 주지 않아요.</Note>

    <Card style={{ marginTop: 20 }}>
      <Row><span style={{ flex: 1 }}>다른 학교 사람만 보기</span><Toggle on={f.other_school_only} onChange={(v) => set('other_school_only', v)} label="다른 학교 사람만 보기" /></Row>
      {!edit && <>
        <Row onClick={() => set('adult', !f.adult)}><span style={{ flex: 1 }}>만 19세 이상 대학(원)생이에요</span><Check on={f.adult} /></Row>
        <Row last onClick={() => set('agreed', !f.agreed)}><span style={{ flex: 1 }}>개인정보 수집·이용 동의</span><Check on={f.agreed} /></Row>
      </>}
    </Card>
    {!edit && <Note>사진·연락처·전화번호 뒷자리는 행사가 끝나고 7일 안에 모두 지워요. <button onClick={() => setMore(!more)}
      style={{ border: 0, background: 'none', padding: 0, color: C.ink, fontWeight: 600, textDecoration: 'underline', fontSize: 13, cursor: 'pointer' }}>{more ? '접기' : '자세히'}</button></Note>}
    {more && <div style={{ margin: '10px 16px 0', ...C.card, padding: '14px 16px', fontSize: 14, lineHeight: 1.6, color: C.ink2 }}>
      <b>수집 항목</b> 학교 메일, 사진, 닉네임, 성별, 출생연도, 키(선택), 한 줄 스펙·소개(선택), 태그, 연락처, 전화번호 뒷자리 4개<br />
      <b>목적</b> 같은 행사 참가자끼리 서로 하트를 보내 연락처를 주고받는 것, 가입비·하트 결제 확인, 신고 처리<br />
      <b>보관 기간</b> 행사 종료 후 7일. 그 전에 탈퇴하면 바로 삭제<br />
      <b>공개 범위</b> 사진·닉네임·학교·나이·키·태그·소개는 가입한 참가자에게, 연락처는 서로 하트를 보낸 사람에게만<br />
      동의하지 않으면 이용할 수 없어요.
    </div>}
  </>;
}

function Check({ on }: { on: boolean }) {
  return <span role="checkbox" aria-checked={on} style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: on ? C.orange : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #C7C7CC' }}>{on && <Icon name="check" size={14} color="#FFFFFF" stroke={3.2} />}</span>;
}

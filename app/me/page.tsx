'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, type MyProfile } from '@/lib/api';
import { useMe, usePhotoUrls } from '@/lib/useMe';
import { BOOTH } from '@/lib/config';
import { C, Card, Heart, Icon, Label, Loading, Note, Row, Screen, SchoolLogo, Tile, TILE, Title, Toggle, TopBar } from '@/components/ui';

export default function Me() {
  const router = useRouter();
  const { me, setMe } = useMe('active');
  const [prof, setProf] = useState<MyProfile | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAnon(!!data.user?.is_anonymous)); }, []);
  useEffect(() => { if (me) api.myProfile().then(setProf).catch(() => {}); }, [me?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const urls = usePhotoUrls([me?.photos[0]]);
  if (!me) return <Loading />;

  const upd = async (s: { other_school_only?: boolean; paused?: boolean }) => {
    setMe({ ...me, ...s });
    try { const st = await api.updateSettings(s); if (st.status !== 'no_profile') setMe(st); } catch {}
  };
  const chev = (v?: string) => <><span style={{ fontSize: 17, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{v}</span><Icon name="chev" size={16} color={C.sub} stroke={2.2} /></>;
  const tags = prof ? [...prof.personality].slice(0, 2).join(' · ') : '';

  return (
    <Screen>
      <div style={{ padding: '16px 20px 0' }}>
        <TopBar back="/browse" label="둘러보기" />
        <Title>내 티켓</Title>
      </div>
      <div style={{ margin: '16px 16px 0', height: 112, borderRadius: 22, background: 'linear-gradient(160deg, #2C2C2E 0%, #141416 100%)', boxShadow: '0 14px 30px -14px rgba(0,0,0,0.55)', position: 'relative', color: '#FFFFFF', display: 'flex' }}>
        <div style={{ padding: 16, display: 'flex', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ width: 80, height: 80, borderRadius: 14, overflow: 'hidden', background: '#3A3A3C', flexShrink: 0 }}>
            {urls[me.photos[0]] && <img src={urls[me.photos[0]]} alt="내 프로필 사진" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }} />}</div>
          <div style={{ minWidth: 0, paddingTop: 4 }}>
            <span style={{ height: 24, padding: '0 9px 0 3px', borderRadius: 12, background: 'rgba(255,255,255,0.14)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}><SchoolLogo school={me.school} />{me.school}</span>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.nickname}</div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.62)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prof ? `${new Date().getFullYear() - prof.birth_year}${tags ? ' · ' + tags : ''}` : ''}</div>
          </div>
        </div>
        <div style={{ borderLeft: '1.5px dashed rgba(255,255,255,0.22)', margin: '14px 0' }} />
        <Link href="/hearts?tab=recv" aria-label="받은 하트 보기" style={{ width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', color: '#FFFFFF' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>매칭</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 26, fontWeight: 800 }} className="tnum"><Heart size={18} color="#FF7A42" />{me.matched}</span></Link>
        <span style={{ position: 'absolute', right: 82, top: -10, width: 20, height: 20, borderRadius: 10, background: '#F2F2F7' }} />
        <span style={{ position: 'absolute', right: 82, bottom: -10, width: 20, height: 20, borderRadius: 10, background: '#F2F2F7' }} />
      </div>

      <Label>티켓 고치기</Label>
      <Card>
        <Row href="/ticket?edit=1&step=1"><Tile icon="camera" bg={TILE.blue} /><span style={{ flex: 1 }}>사진과 기본 정보</span>{chev()}</Row>
        <Row href="/ticket?edit=1&step=2"><Tile icon="tag" bg={TILE.purple} /><span style={{ flex: 1 }}>나는 이런 사람</span>{chev()}</Row>
        <Row href="/ticket?edit=1&step=3"><Tile icon="tag" bg={TILE.orange} /><span style={{ flex: 1 }}>이상형</span>{chev()}</Row>
        <Row last href="/ticket?edit=1&step=4"><Tile icon={me.contact_type === 'instagram' ? 'ig' : 'phone'} bg={TILE.pink} /><span style={{ flex: 1 }}>연락처</span>
          {chev(me.contact_type === 'instagram' ? '@' + me.contact : me.contact)}</Row>
      </Card>

      <Card style={{ marginTop: 22 }}>
        <Row><Tile icon="school" bg={TILE.green} /><span style={{ flex: 1 }}>다른 학교 사람만 보기</span>
          <Toggle on={me.other_school_only} onChange={(v) => upd({ other_school_only: v })} label="다른 학교 사람만 보기" /></Row>
        <Row last><Tile icon="eye-off" bg={TILE.grey} /><span style={{ flex: 1 }}>내 티켓 잠시 숨기기</span>
          <Toggle on={me.paused} onChange={(v) => upd({ paused: v })} label="내 티켓 잠시 숨기기" /></Row>
      </Card>
      <Note>숨기면 다른 사람 둘러보기에 안 나와요. 받은 하트와 매칭은 그대로예요.</Note>

      <Card style={{ marginTop: 22 }}>
        <Row href="/charge"><span style={{ width: 30, height: 30, borderRadius: 8, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={16} color="#FFFFFF" /></span>
          <span style={{ flex: 1 }}>남은 하트</span>{chev(`${me.hearts}개`)}</Row>
        <Row last><Tile icon="help" bg={TILE.grey} /><span style={{ flex: 1 }}>문의하기</span><span style={{ fontSize: 15, color: C.sub }}>{BOOTH.location}</span></Row>
      </Card>

      <Card style={{ marginTop: 22 }}>
        {!anon && <Row onClick={async () => { await supabase.auth.signOut(); router.replace('/start'); }}><span style={{ flex: 1 }}>로그아웃</span></Row>}
        <Row last onClick={() => setConfirmDel(true)}><span style={{ flex: 1, color: C.red }}>탈퇴하고 내 정보 모두 지우기</span></Row>
      </Card>
      <Note>{anon ? '이 휴대폰 브라우저에 로그인돼 있어요. 브라우저 기록을 지우면 다시 들어올 수 없으니 주의하세요. ' : ''}탈퇴하면 사진·연락처·하트 기록이 바로 지워져요. 남은 하트는 돌려받을 수 없어요.</Note>

      {confirmDel && (
        <div role="alertdialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 320, borderRadius: 18, background: '#FFFFFF', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '22px 18px 18px' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>정말 탈퇴할까요?</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: C.ink2 }}>매칭된 사람 목록과 남은 하트 {me.hearts}개가 사라지고 되돌릴 수 없어요.</div>
            </div>
            <div style={{ display: 'flex', borderTop: C.sep }}>
              <button onClick={() => setConfirmDel(false)} style={{ flex: 1, height: 50, border: 0, background: 'none', fontSize: 17, cursor: 'pointer' }}>취소</button>
              <button disabled={busy} onClick={async () => { setBusy(true); try { await api.deleteAccount(); router.replace('/start'); } catch { setBusy(false); setConfirmDel(false); alert('탈퇴하지 못했어요. 부스에 문의해 주세요.'); } }}
                style={{ flex: 1, height: 50, border: 0, borderLeft: C.sep, background: 'none', fontSize: 17, fontWeight: 700, color: C.red, cursor: 'pointer' }}>{busy ? '지우는 중…' : '탈퇴'}</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}

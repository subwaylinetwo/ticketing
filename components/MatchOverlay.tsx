'use client';
// 매칭 성공 화면 (둘러보기·하트 목록 어디서든 띄움)
import { useState } from 'react';
import type { ContactType, School } from '@/lib/api';
import { usePhotoUrls } from '@/lib/useMe';
import { C, copyText, Heart, Icon, SchoolLogo } from './ui';

export type Partner = { id: string; nickname: string; school: School; photo: string; contact_type: ContactType; contact: string };

function Mini({ label, name, school, url, rot, z, style }: { label: string; name: string; school: School; url?: string; rot: number; z: number; style: React.CSSProperties }) {
  return (
    <div className="rise" style={{ position: 'absolute', width: 168, height: 200, borderRadius: 18, overflow: 'hidden', background: '#FFFFFF', transform: `rotate(${rot}deg)`, zIndex: z,
      boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)', ...style }}>
      <div style={{ height: 128, background: url ? `url(${url}) 50% 22% / cover` : 'linear-gradient(160deg, #D1D1D6 0%, #AEAEB2 100%)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 8, top: 8, height: 24, padding: '0 9px 0 3px', borderRadius: 12, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: C.ink }}>
          <SchoolLogo school={school} />{school}</span>
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1.5px dashed rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 12, color: C.sub }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      </div>
    </div>
  );
}

export function MatchOverlay({ me, partner, onClose }: {
  me: { nickname: string; school: School; photo?: string | null }; partner: Partner; onClose: () => void;
}) {
  const urls = usePhotoUrls([me.photo, partner.photo]);
  const [copied, setCopied] = useState(false);
  const ig = partner.contact_type === 'instagram';
  const shown = ig ? '@' + partner.contact : partner.contact;
  const href = ig ? `https://instagram.com/${encodeURIComponent(partner.contact)}` : `sms:${partner.contact.replace(/[^\d]/g, '')}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="매칭됐어요" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0E0E10', color: '#FFFFFF', overflowY: 'auto' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 45% at 50% 42%, rgba(242,85,27,0.55) 0%, rgba(242,85,27,0) 70%)' }} />
      <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '0 20px calc(24px + var(--safe-b))' }}>
        <div style={{ position: 'relative', height: 300, marginTop: 'max(24px, 6dvh)' }}>
          <Mini label="나" name={me.nickname} school={me.school} url={me.photo ? urls[me.photo] : undefined} rot={-8} z={1} style={{ left: '4%', top: 30 }} />
          <Mini label="상대" name={partner.nickname} school={partner.school} url={urls[partner.photo]} rot={7} z={2} style={{ right: '4%', top: 10, animationDelay: '.08s' }} />
          <div className="pop" style={{ position: 'absolute', left: '50%', top: 196, marginLeft: -44, width: 88, height: 88, borderRadius: 44, background: C.orange, zIndex: 3,
            boxShadow: '0 0 0 8px rgba(255,255,255,0.12), 0 18px 40px rgba(236,74,18,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={42} color="#FFFFFF" /></div>
        </div>
        <h1 style={{ margin: '28px 0 0', textAlign: 'center', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>매칭됐어요</h1>
        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)' }}>
          {partner.nickname} 님도 하트를 보냈어요.<br />오늘 행사장에서 바로 만나 볼 수도 있어요.</p>
        <div style={{ marginTop: 24, borderRadius: 18, background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14)', padding: '12px 10px 12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{ig ? '인스타그램' : '전화번호'}</div>
            <div className="tnum" style={{ fontSize: 21, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shown}</div>
          </div>
          <button aria-label="연락처 복사" onClick={async () => { if (await copyText(shown)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
            style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: copied ? '#34C759' : 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name={copied ? 'check' : 'copy'} size={18} color="#FFFFFF" stroke={2} /></button>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 28 }}>
          <a href={href} target={ig ? '_blank' : undefined} rel="noreferrer"
            style={{ height: 58, borderRadius: 29, background: C.orange, boxShadow: '0 12px 28px -10px rgba(236,74,18,0.8)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, textDecoration: 'none' }}>
            {ig ? '인스타그램에서 메시지 보내기' : '문자 보내기'}</a>
          <button onClick={onClose} style={{ width: '100%', height: 50, marginTop: 6, border: 0, background: 'none', color: '#FFFFFF', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>계속 둘러보기</button>
        </div>
      </div>
    </div>
  );
}

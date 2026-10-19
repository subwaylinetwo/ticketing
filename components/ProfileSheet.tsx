'use client';
// 하트 목록에서 사람을 누르면 아래에서 올라오는 프로필
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Card } from '@/lib/api';
import { usePhotoUrls } from '@/lib/useMe';
import { C, Icon, SchoolLogo, Spinner } from './ui';

export function ProfileSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [p, setP] = useState<Card | null>(null);
  const [err, setErr] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => { api.viewProfile(id).then(setP).catch(() => setErr(true)); }, [id]);
  const urls = usePhotoUrls(p?.photos ?? []);
  const tags = p ? [...p.personality, ...p.interests, ...p.wants] : [];

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '92dvh', overflowY: 'auto', background: '#1C1C1E', color: '#FFFFFF', borderRadius: '24px 24px 0 0', paddingBottom: 'calc(20px + var(--safe-b))' }}>
        {!p ? <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{err ? '볼 수 없는 사람이에요' : <Spinner light />}</div> : <>
          <div onClick={() => setI((i + 1) % p.photos.length)} style={{ position: 'relative', aspectRatio: '4 / 5', maxHeight: '62dvh', width: '100%', background: '#2C2C2E', cursor: 'pointer' }}>
            {urls[p.photos[i]] && <img src={urls[p.photos[i]]} alt={`${p.nickname} 님 사진`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 28%' }} />}
            {p.photos.length > 1 && <div style={{ position: 'absolute', top: 10, left: 12, right: 60, display: 'flex', gap: 4 }}>
              {p.photos.map((_, k) => <span key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: k === i ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />)}</div>}
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="닫기" style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, border: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="close" size={16} color="#FFFFFF" stroke={2.6} /></button>
          </div>
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{p.nickname}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}><SchoolLogo school={p.school} />{p.school}</span>
            </div>
            <div className="tnum" style={{ marginTop: 4, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{p.age}{p.height ? ` · ${p.height}cm` : ''}{p.spec ? ` · ${p.spec}` : ''}</div>
            {p.intro && <div style={{ marginTop: 10, fontSize: 16, lineHeight: 1.5 }}>{p.intro}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t) => { const m = p.matching_tags.includes(t);
                return <span key={t} style={{ height: 30, padding: '0 12px', borderRadius: 15, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600,
                  ...(m ? { background: 'rgba(242,85,27,0.32)', boxShadow: 'inset 0 0 0 1px rgba(255,138,86,0.85)' } : { background: 'rgba(255,255,255,0.12)' }) }}>{t}</span>; })}
            </div>
            <Link href={`/report/${p.id}?name=${encodeURIComponent(p.nickname)}`} style={{ display: 'inline-block', marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>신고하기</Link>
          </div>
        </>}
      </div>
    </div>
  );
}

export const SHEET_BG = C.ink;

'use client';
// 화면들이 같이 쓰는 작은 부품. 디자인 시안(A3)의 값 그대로.
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { School } from '@/lib/api';

export const C = {
  ink: '#111113', ink2: '#3A3A3F', sub: '#5C5C63', bg: '#F2F2F7', accent: '#F2551B', red: '#E5352B',
  orange: 'linear-gradient(180deg, #FF7136 0%, #EC4A12 100%)',
  inkGrad: 'linear-gradient(180deg, #2E2E31 0%, #111113 100%)',
  glow: 'radial-gradient(130% 34% at 50% -6%, rgba(255,138,86,0.12) 0%, rgba(255,138,86,0) 70%), #F2F2F7',
  card: { background: '#FFFFFF', borderRadius: 18, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)' } as CSSProperties,
  sep: '0.5px solid rgba(60,60,67,0.2)',
};

const HEART_D = 'M12 21.2l-1.5-1.3C5.4 15.3 2 12.2 2 8.4 2 5.3 4.4 3 7.4 3c1.7 0 3.4.8 4.6 2.1C13.2 3.8 14.9 3 16.6 3 19.6 3 22 5.3 22 8.4c0 3.8-3.4 6.9-8.5 11.5L12 21.2z';

export function Heart({ size = 16, color = '#F2551B', style }: { size?: number; color?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}><path d={HEART_D} fill={color} /></svg>;
}

type IconName = 'back' | 'chev' | 'close' | 'check' | 'copy' | 'more' | 'chat' | 'ig' | 'phone' | 'camera' | 'tag'
  | 'school' | 'eye-off' | 'help' | 'clock' | 'store' | 'pen' | 'won' | 'mail' | 'refresh' | 'alert' | 'plus' | 'image' | 'up' | 'people';
const PATHS: Record<IconName, ReactNode> = {
  back: <path d="M15 18l-6-6 6-6" />, chev: <path d="M9 18l6-6-6-6" />, close: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />, up: <path d="M6 15l6-6 6 6" />, plus: <path d="M12 5v14M5 12h14" />,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>,
  more: <><circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" /></>,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  ig: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  camera: <><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="12" cy="12.5" r="3.5" /><path d="M9 5l1.2-2h3.6L15 5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></>,
  tag: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></>,
  school: <path d="M3 21h18M5 21V10l7-5 7 5v11M9.5 21v-5h5v5" />,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.5 10 7-0.4 1-1.2 2.3-2.4 3.5M6.3 6.3C4.2 7.7 2.7 9.8 2 12c1 2.5 5 7 10 7 1.7 0 3.3-.5 4.6-1.3" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8" /><path d="M12 17.2v.1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  store: <><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M10 20v-6h4v6" /></>,
  pen: <path d="M4 20h4L19 9l-4-4L4 16v4z" />, won: <path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" />,
  mail: <><path d="M3 6h18v12H3z" /><path d="M3 7l9 6 9-6" /></>,
  refresh: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.4v.1" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.8c1.6.8 2.7 2.6 3 5.2" /></>,
};
export function Icon({ name, size = 20, color = 'currentColor', stroke = 2.1, style }:
  { name: IconName; size?: number; color?: string; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color, flexShrink: 0, ...style }}>{PATHS[name]}</svg>
  );
}

// 학교 로고 자리 (로고 파일을 받으면 여기서 이미지로 교체)
export function SchoolLogo({ size = 18 }: { size?: number; school?: School }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0, display: 'inline-block',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #D7D7DC 100%)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.14)' }} />;
}
export function SchoolText({ school, dark }: { school: School; dark?: boolean }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.7)' : C.sub, flexShrink: 0 }}>
    <SchoolLogo size={15} school={school} />{school}</span>;
}

export function Screen({ children, bg = C.glow, style }: { children: ReactNode; bg?: string; style?: CSSProperties }) {
  return <div className="screen" style={{ background: bg, paddingBottom: 'calc(120px + var(--safe-b))', ...style }}>{children}</div>;
}

export function TopBar({ back, label, right }: { back?: string | (() => void); label?: string; right?: ReactNode }) {
  const inner = <><Icon name="back" size={22} stroke={2.2} style={{ margin: label ? '0 2px 0 10px' : 0 }} />{label}</>;
  const st: CSSProperties = label
    ? { height: 44, paddingRight: 8, display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: 17, color: C.ink, background: 'none', border: 0, cursor: 'pointer' }
    : { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, cursor: 'pointer', color: C.ink };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, margin: '0 0 0 -12px' }}>
      {typeof back === 'string' ? <Link href={back} aria-label={label ?? '이전으로'} style={st}>{inner}</Link>
        : back ? <button onClick={back} aria-label={label ?? '이전으로'} style={st}>{inner}</button> : <span />}
      {right}
    </div>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return <>
    <h1 style={{ margin: '4px 0 0', fontSize: 30, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.025em' }}>{children}</h1>
    {sub && <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: 1.5, color: C.ink2 }}>{sub}</p>}
  </>;
}

export function Label({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return <div style={{ margin: '22px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.sub, ...style }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</span>{right}</div>;
}
export function Note({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ margin: '8px 20px 0', fontSize: 13, lineHeight: 1.45, color: C.sub, ...style }}>{children}</div>;
}
export function Card({ children, style, pad = true }: { children: ReactNode; style?: CSSProperties; pad?: boolean }) {
  return <div style={{ margin: '0 16px', ...C.card, ...(pad ? { paddingLeft: 14 } : {}), ...style }}>{children}</div>;
}

export function Tile({ icon, bg }: { icon: IconName; bg: string }) {
  return <span style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <Icon name={icon} size={17} color="#FFFFFF" stroke={2} /></span>;
}
export const TILE = {
  grey: 'linear-gradient(180deg, #A2A2A8 0%, #8A8A90 100%)', blue: 'linear-gradient(180deg, #4C8DFF 0%, #2F6FE8 100%)',
  purple: 'linear-gradient(180deg, #B07CF0 0%, #8C55DB 100%)', pink: 'linear-gradient(180deg, #F2689A 0%, #DB3F78 100%)',
  green: 'linear-gradient(180deg, #4CD37A 0%, #2DB45C 100%)', orange: C.orange,
};

export function Row({ children, last, onClick, href, style }:
  { children: ReactNode; last?: boolean; onClick?: () => void; href?: string; style?: CSSProperties }) {
  const st: CSSProperties = { minHeight: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px 8px 0',
    borderBottom: last ? 0 : C.sep, textDecoration: 'none', color: C.ink, width: '100%', background: 'none', borderTop: 0, borderLeft: 0, borderRight: 0,
    textAlign: 'left', fontSize: 17, cursor: href || onClick ? 'pointer' : 'default', ...style };
  if (href) return <Link href={href} style={st}>{children}</Link>;
  if (onClick) return <button onClick={onClick} style={st}>{children}</button>;
  return <div style={st}>{children}</div>;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ width: 51, height: 31, border: 0, padding: 0, borderRadius: 16, background: on ? '#34C759' : 'rgba(120,120,128,0.16)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: '#FFFFFF',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.04)', transition: 'left .2s cubic-bezier(.3,.7,.3,1)' }} />
    </button>
  );
}

const BTN: CSSProperties = { width: '100%', height: 56, borderRadius: 28, border: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, fontSize: 18, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' };
export function InkButton({ children, onClick, href, disabled, busy, style }:
  { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean; busy?: boolean; style?: CSSProperties }) {
  const st: CSSProperties = { ...BTN, background: disabled ? '#C7C7CC' : C.inkGrad,
    boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 14px -6px rgba(0,0,0,0.45)', ...style };
  if (href && !disabled) return <Link href={href} style={st}>{children}</Link>;
  return <button style={st} onClick={onClick} disabled={disabled || busy}>{busy ? <Spinner light /> : children}</button>;
}
export function OrangeButton({ children, onClick, href, disabled, busy, style }:
  { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean; busy?: boolean; style?: CSSProperties }) {
  const st: CSSProperties = { ...BTN, height: 58, borderRadius: 29, fontWeight: 700, background: C.orange,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 12px 28px -10px rgba(236,74,18,0.8)', ...style };
  if (href) return <Link href={href} style={st}>{children}</Link>;
  return <button style={st} onClick={onClick} disabled={disabled || busy}>{busy ? <Spinner light /> : children}</button>;
}
export function FootBar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', justifyContent: 'center',
    background: 'rgba(242,242,247,0.78)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', backdropFilter: 'blur(24px) saturate(180%)', ...style }}>
    <div style={{ width: '100%', maxWidth: 480, padding: '12px 16px calc(20px + var(--safe-b))' }}>{children}</div></div>;
}
export function Spinner({ light, size = 18 }: { light?: boolean; size?: number }) {
  return <span className="spin" aria-label="불러오는 중" style={{ width: size, height: size, borderRadius: size / 2, display: 'inline-block',
    border: `2px solid ${light ? 'rgba(255,255,255,0.35)' : '#D1D1D6'}`, borderTopColor: light ? '#FFFFFF' : C.ink }} />;
}
export function Loading() {
  return <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}><Spinner size={24} /></div>;
}

export function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button aria-pressed={on} onClick={onClick} style={{ height: 40, padding: '0 14px', border: 0, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 15, fontWeight: 600, cursor: 'pointer',
      ...(on ? { background: C.inkGrad, color: '#FFFFFF', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)' }
             : { background: '#FFFFFF', color: C.ink, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.05)' }) }}>
      {on && <Icon name="check" size={14} color="#FFFFFF" stroke={3.2} />}{children}
    </button>
  );
}

export function Avatar({ url, name, size = 52, ring, dot }: { url?: string; name: string; size?: number; ring?: boolean; dot?: boolean }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, position: 'relative', flexShrink: 0,
      boxShadow: ring ? '0 0 0 2px #FFFFFF, 0 0 0 4px #FF7136' : undefined }}>
      <div style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', background: 'linear-gradient(180deg, #A9A9AF 0%, #858589 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: size * 0.4, fontWeight: 600 }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%' }} /> : name.charAt(0)}
      </div>
      {dot && <span aria-label="새 매칭" style={{ position: 'absolute', right: -1, top: -1, width: 14, height: 14, borderRadius: 7, background: C.accent, border: '2px solid #FFFFFF' }} />}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div role="alert" style={{ margin: '12px 20px 0', display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 15, fontWeight: 600, color: C.red, lineHeight: 1.45 }}>
    <Icon name="alert" size={17} color={C.red} stroke={2.2} style={{ marginTop: 2 }} />{children}</div>;
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function ContactLine({ type, contact, dark }: { type: 'instagram' | 'phone' | null; contact: string | null; dark?: boolean }) {
  if (!contact) return null;
  return <div className="tnum" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, fontWeight: 500, color: dark ? '#FFFFFF' : C.ink }}>
    <Icon name={type === 'instagram' ? 'ig' : 'phone'} size={15} color={dark ? '#FFFFFF' : C.ink2} stroke={2} />
    {type === 'instagram' ? '@' + contact : contact}</div>;
}

export function Wordmark() {
  return (
    <span role="img" aria-label="티켓-팅" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em' }}>
      <span className="wm-l" aria-hidden="true">티켓</span>
      <span aria-hidden="true" style={{ position: 'relative', width: 18, height: 20, display: 'flex', alignItems: 'center' }}>
        <svg className="wm-h" width="20" height="20" viewBox="0 0 24 24" style={{ position: 'absolute', left: '50%', top: '50%', margin: '-11.3px 0 0 -10px', filter: 'drop-shadow(0 0 7px rgba(255,122,66,0.7))' }}>
          <path fill="#FF7A42" d={HEART_D} /></svg>
        <span className="wm-dc" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 20, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'flex', flexShrink: 0, width: 18 }}>
            <svg className="wm-dl" width="9" height="4" viewBox="0 0 9 4" style={{ display: 'block', overflow: 'visible' }}>
              <rect x="0" y="0.9" width="4.5" height="2.2" rx="1.1" fill="rgba(255,255,255,0.82)" /><rect x="7" y="0.9" width="2.3" height="2.2" fill="rgba(255,255,255,0.82)" /></svg>
            <svg className="wm-dr" width="9" height="4" viewBox="0 0 9 4" style={{ display: 'block' }}>
              <rect x="0" y="0.9" width="2" height="2.2" fill="rgba(255,255,255,0.82)" /><rect x="4.5" y="0.9" width="4.5" height="2.2" rx="1.1" fill="rgba(255,255,255,0.82)" /></svg>
          </span>
        </span>
      </span>
      <span className="wm-r" aria-hidden="true" style={{ color: '#FF7A42' }}>팅</span>
    </span>
  );
}

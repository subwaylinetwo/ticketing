// 현수막과 같은 장식: 문살 코너, 구름 문양, 액자 모서리, 먹산수
const C = 'var(--hong)';

export function Corners({ size = 92 }: { size?: number }) {
  const s = { position: 'absolute' as const, top: 10, width: size, height: size, pointerEvents: 'none' as const };
  const svg = (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={C} strokeWidth="1.6" aria-hidden="true">
      <path d="M4 100V4h96" /><path d="M13 70V13h57" />
      <path d="M4 34h17v-8h5V4" /><path d="M13 13h9v9h-9z" />
      <path d="M26 4v9" opacity=".7" /><path d="M4 26h9" opacity=".7" />
    </svg>
  );
  return (
    <>
      <span style={{ ...s, left: 10 }}>{svg}</span>
      <span style={{ ...s, right: 10, transform: 'scaleX(-1)' }}>{svg}</span>
    </>
  );
}

export function Cloud({ flip }: { flip?: boolean }) {
  return (
    <svg width="58" height="34" viewBox="0 0 58 34" fill="none" stroke={C} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"
      style={{ transform: flip ? 'scaleX(-1)' : undefined, flexShrink: 0 }}>
      <path d="M44 22a8 8 0 1 0-8-8 4.5 4.5 0 1 0 4.5-4.5" />
      <path d="M30 26a6.5 6.5 0 1 0-6.5-6.5 3.5 3.5 0 1 0 3.5-3.5" />
      <path d="M20 29H4" /><path d="M54 26c-4 3-12 4-20 3" /><path d="M14 24H8" />
    </svg>
  );
}

// 액자 모서리의 작은 문살 무늬
function Knot({ style }: { style: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--frame)" strokeWidth="1.2" aria-hidden="true" style={{ position: 'absolute', ...style }}>
      <path d="M4 1v12M10 1v12M1 4h12M1 10h12" />
    </svg>
  );
}

// 현수막 메뉴 칸: 이중 테두리 + 위쪽 빨간 리본 + 네 모서리 문살
export function Frame({ title, children, style, dim }: { title: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties; dim?: boolean }) {
  return (
    <div className="frame" style={{ opacity: dim ? .55 : 1, ...style }}>
      <div className="ribbon">{title}</div>
      <Knot style={{ top: 9, left: 9 }} /><Knot style={{ top: 9, right: 9 }} />
      <Knot style={{ bottom: 9, left: 9 }} /><Knot style={{ bottom: 9, right: 9 }} />
      {children}
    </div>
  );
}

export function Flourish() {
  return (
    <svg width="100%" height="16" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M0 8h120M180 8h120" stroke={C} strokeWidth="1.2" />
      <path d="M128 8c4-6 10-6 12 0s8 6 10 0 8-6 10 0 8 6 12 0" stroke={C} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

// 바닥의 먹 번진 산
export function Mountains() {
  return (
    <svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 170, pointerEvents: 'none', opacity: .26 }}>
      <defs><filter id="efInk" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5" /></filter></defs>
      <g filter="url(#efInk)">
        <path d="M0 140V70c18-10 30-34 52-30 18 4 22 30 40 34 14 3 20-8 34-4 12 4 10 30 24 70z" fill="#7d7a78" />
        <path d="M400 140V60c-16-8-28-30-50-26-20 4-24 34-44 38-16 3-24-10-38-4-12 6-10 32-28 72z" fill="#6f6c6a" />
        <path d="M120 140c20-30 50-40 80-36s60 20 90 36z" fill="#a5a2a0" />
      </g>
    </svg>
  );
}

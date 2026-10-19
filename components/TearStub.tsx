'use client';
// 티켓 아래쪽 '스텁'. 오른쪽으로 끌면 왼쪽 모서리부터 종이처럼 말려 올라오며 뜯어진다.
// 24개 얇은 조각을 오른쪽 끝을 뿌리로 이어 붙이고, 조각마다 rotateY/rotateZ 를 조금씩 줘서 휘게 만든다.
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

export const SLICES = 24;
export const STUB_H = 100;

type Curl = { tf: string; sa: number; sh: number; ba: number; bb: number }[];

// t: 0(그대로) → 1(끝까지 당김) → 1.5(뜯어짐)
export function curl(t: number): Curl {
  const N = SLICES, M = 10, RY = 72, RZ = 12;
  const front = t >= 1.5 ? N * 0.82 : N * 0.52 * t;
  const k = Math.min(1, t * 4);
  const S = (d: number) => { const x = Math.max(0, Math.min(1, d / M)); return x * x * (3 - 2 * x); };
  const shade = (deg: number) => Math.min(0.5, 0.5 * Math.sin((Math.min(90, deg) * Math.PI) / 180));
  const light = (deg: number) => 0.02 + 0.08 * Math.max(0, Math.sin((Math.max(0, deg - 60) * Math.PI) / 180));
  const out: Curl = [];
  for (let i = 0; i < N; i++) {
    const ci = S(front - i) * k, cr = i + 1 < N ? S(front - i - 1) * k : 0;
    const a = ci - cr, d = front - i;
    const cast = d > -2.5 && d <= 0.5 ? 0.22 * (1 - Math.abs(d + 1) / 1.5) * k : 0;
    out.push({ tf: `rotateY(${(a * RY).toFixed(2)}deg) rotateZ(${(-a * RZ).toFixed(2)}deg)`,
      sa: Math.max(cast, shade(ci * RY)), sh: Math.max(cast, shade(cr * RY)), ba: light(ci * RY), bb: light(cr * RY) });
  }
  return out;
}

function shape(W: number): CSSProperties {
  const R = 11, tile = W / 60;
  const m = `radial-gradient(circle at 0 0, transparent ${R - 0.5}px, #000 ${R}px), radial-gradient(circle at 100% 0, transparent ${R - 0.5}px, #000 ${R}px), radial-gradient(circle at 50% 0, transparent 2.2px, #000 2.7px) 0 0 / ${tile.toFixed(4)}px 100% repeat-x`;
  return { borderRadius: '0 0 26px 26px', WebkitMask: m, WebkitMaskComposite: 'source-in', mask: m, maskComposite: 'intersect' } as CSSProperties;
}

const HIDE: CSSProperties = { WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' };

export function TearStub({ W, c, trans, motion, nudge, content, handlers, label }: {
  W: number; c: Curl; trans: string; motion: CSSProperties; nudge: boolean; content: ReactNode; label: string;
  handlers: { onPointerDown: (e: PointerEvent<HTMLDivElement>) => void; onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void; onPointerCancel: () => void };
}) {
  const w = W / SLICES, OV = 1, sh = shape(W);
  const slice = (i: number, root: boolean): ReactNode => {
    const sw = root ? w : w + OV;
    const x = i * w, xb = W - x - sw;
    const v = c[i];
    return (
      <div className={i === 3 && nudge ? 'nudge' : undefined}
        style={{ position: 'absolute', left: root ? (SLICES - 1) * w : -w, top: 0, width: sw, height: STUB_H, transformOrigin: '100% 0',
          transformStyle: 'preserve-3d', transform: v.tf, transition: trans }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...HIDE }}>
          <div style={{ position: 'absolute', left: -x, top: 0, width: W, height: STUB_H, background: '#1C1C1E', ...sh }}>
            <div aria-hidden={i > 0}>{content}</div>
            <div style={{ position: 'absolute', left: x, top: 0, width: sw, height: STUB_H, background: `linear-gradient(to right, rgba(0,0,0,${v.sa.toFixed(3)}) 0%, rgba(0,0,0,${v.sh.toFixed(3)}) 100%)` }} />
          </div>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: 'rotateY(180deg)', ...HIDE }}>
          <div style={{ position: 'absolute', left: -xb, top: 0, width: W, height: STUB_H, background: 'linear-gradient(180deg, #2E2E31 0%, #232326 100%)', ...sh }}>
            <div style={{ position: 'absolute', left: xb, top: 0, width: sw, height: STUB_H, background: `linear-gradient(to left, rgba(255,255,255,${v.ba.toFixed(3)}) 0%, rgba(255,255,255,${v.bb.toFixed(3)}) 100%)` }} />
          </div>
        </div>
        {i > 0 && slice(i - 1, false)}
      </div>
    );
  };
  return (
    <div {...handlers} role="group" aria-label={label}
      style={{ position: 'relative', zIndex: 1, height: STUB_H, perspective: 520, perspectiveOrigin: '30% 40%', transformStyle: 'preserve-3d',
        touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none', ...motion }}>
      {W > 0 && slice(SLICES - 1, true)}
    </div>
  );
}

// 카드 사진 아래쪽: 스텁과 맞물리는 홈(양쪽 반원)과 절취선 톱니
export function cardMask(W: number): CSSProperties {
  const tile = W / 60;
  const m = `radial-gradient(circle at 0 100%, transparent 10.5px, #000 11px), radial-gradient(circle at 100% 100%, transparent 10.5px, #000 11px), radial-gradient(circle at 50% 100%, transparent 2.2px, #000 2.7px) 0 0 / ${tile.toFixed(4)}px 100% repeat-x`;
  return { WebkitMask: m, WebkitMaskComposite: 'source-in', mask: m, maskComposite: 'intersect' } as CSSProperties;
}

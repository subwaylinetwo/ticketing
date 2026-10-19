'use client';
import { useState } from 'react';
import { BOOTH } from '@/lib/config';
import { C, Card, copyText } from './ui';

export function Account({ amount, tag }: { amount: number; tag: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card style={{ paddingLeft: 16 }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', paddingRight: 16, borderBottom: C.sep }}>
        <span style={{ flex: 1, fontSize: 17 }}>금액</span><span className="tnum" style={{ fontSize: 17, fontWeight: 600 }}>{amount.toLocaleString()}원</span></div>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', paddingRight: 16, borderBottom: C.sep }}>
        <span style={{ flex: 1, fontSize: 17 }}>입금자명</span><span style={{ fontSize: 17, fontWeight: 600 }}>이름 + <span className="tnum">{tag}</span></span></div>
      <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12, paddingRight: 8 }}>
        <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13, color: C.sub }}>{BOOTH.bank} {BOOTH.holder}</span>
          <span className="tnum" style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{BOOTH.account}</span></span>
        <button onClick={async () => { if (await copyText(BOOTH.account.replace(/[^\d-]/g, ''))) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
          style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: copied ? '#34C759' : C.bg, color: copied ? '#FFFFFF' : C.ink, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {copied ? '복사됨' : '복사'}</button>
      </div>
    </Card>
  );
}


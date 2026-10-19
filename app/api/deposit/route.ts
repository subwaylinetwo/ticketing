// MacroDroid → POST /api/deposit
// 헤더 x-deposit-secret: DEPOSIT_SECRET
// 본문: 알림 원문 그대로(text/plain) 또는 JSON { "text": "[알림 원문]" }
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parseDeposit } from '@/lib/parseDeposit';

export const runtime = 'nodejs';

function okSecret(got: string | null) {
  const want = process.env.DEPOSIT_SECRET ?? '';
  if (!got || !want || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function POST(req: Request) {
  if (!okSecret(req.headers.get('x-deposit-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // MacroDroid에서 JSON을 직접 만들면 알림 속 따옴표·줄바꿈 때문에 깨지기 쉬워서 원문 그대로도 받음
  const rawBody = await req.text().catch(() => '');
  let text = rawBody;
  try { const j = JSON.parse(rawBody); if (typeof j?.text === 'string') text = j.text; } catch { /* 원문 그대로 */ }
  text = text.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: 'no_text' }, { status: 400 });

  const parsed = parseDeposit(text);
  if (!parsed) return NextResponse.json({ result: 'not_a_deposit' });   // 출금 알림 등

  const { data, error } = await supabaseAdmin().rpc('ingest_deposit', {
    raw: text, name: parsed.name, amount: parsed.amount,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

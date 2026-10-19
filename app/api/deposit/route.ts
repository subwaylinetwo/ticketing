// MacroDroid → POST /api/deposit
// 헤더 x-deposit-secret: DEPOSIT_SECRET, 본문 JSON { "text": "[알림 원문]" }
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
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 500) : '';
  if (!text) return NextResponse.json({ error: 'no_text' }, { status: 400 });

  const parsed = parseDeposit(text);
  if (!parsed) return NextResponse.json({ result: 'not_a_deposit' });   // 출금 알림 등

  const { data, error } = await supabaseAdmin().rpc('ingest_deposit', {
    raw: text, name: parsed.name, amount: parsed.amount,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

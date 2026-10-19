// 탈퇴: 사진 파일 → 계정 순으로 지운다. (프로필·하트·신고는 DB에서 함께 지워짐)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: files } = await supabaseAdmin().storage.from('photos').list(user.id, { limit: 100 });
  if (files?.length) {
    await supabaseAdmin().storage.from('photos').remove(files.map((f) => `${user.id}/${f.name}`));
  }
  const { error: delErr } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 매일 한 번 (vercel.json cron). 행사 끝나고 7일이 지났으면 사진 전부 → DB 순으로 지운다.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data: due, error } = await supabaseAdmin().rpc('purge_due');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due) return NextResponse.json({ result: 'not_yet' });

  const bucket = supabaseAdmin().storage.from('photos');
  let removed = 0;
  for (let round = 0; round < 50; round++) {   // 무한 반복 방지
    const { data: folders } = await bucket.list('', { limit: 100 });
    if (!folders?.length) break;
    for (const folder of folders) {
      const { data: files } = await bucket.list(folder.name, { limit: 100 });
      const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`);
      if (paths.length) { await bucket.remove(paths); removed += paths.length; }
    }
    if (folders.length < 100) {
      const { data: left } = await bucket.list('', { limit: 1 });
      if (!left?.length) break;
    }
  }
  const { data: result, error: purgeErr } = await supabaseAdmin().rpc('purge_after_event');
  if (purgeErr) return NextResponse.json({ error: purgeErr.message, removed }, { status: 500 });
  return NextResponse.json({ result, removed });
}

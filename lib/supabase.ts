// 브라우저용 Supabase 클라이언트
import { createClient } from '@supabase/supabase-js';

// 환경변수가 빠진 채 빌드돼도 빌드 자체는 죽지 않게 함 (실제 요청은 실패하므로 Vercel 설정 필수)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://missing-env.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-env';

export const supabase = createClient(url, key);

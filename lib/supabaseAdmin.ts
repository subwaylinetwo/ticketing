// 서버 전용. service_role(secret) 키는 절대 브라우저 코드에서 import 하지 말 것.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// 키가 없으면 빌드는 되고, 호출할 때 분명한 오류를 낸다
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없어요');
  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

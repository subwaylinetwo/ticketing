import type { School } from './api';

// DB의 school_of 와 같은 규칙 (dgist.ac.kr 이 gist.ac.kr 로 끝나는 것 주의)
const DOMAINS: [string, School][] = [
  ['gist.ac.kr', 'GIST'], ['dgist.ac.kr', 'DGIST'], ['kaist.ac.kr', 'KAIST'],
  ['postech.ac.kr', 'POSTECH'], ['unist.ac.kr', 'UNIST'], ['kentech.ac.kr', 'KENTECH'],
];

// 테스트 계정: NEXT_PUBLIC_TEST_EMAIL_PREFIX(예: myname+)로 시작하는 Gmail을 학교 메일로 인정
// DB의 settings.test_email_prefix 와 같은 값이어야 함. 행사 전에 둘 다 비우기.
const TEST_PREFIX = (process.env.NEXT_PUBLIC_TEST_EMAIL_PREFIX ?? '').trim().toLowerCase();
function testSchool(e: string): School | null {
  if (!TEST_PREFIX || !e.startsWith(TEST_PREFIX) || !e.endsWith('@gmail.com')) return null;
  const local = e.split('@')[0];
  for (const s of ['kaist', 'postech', 'unist', 'dgist', 'kentech'] as const) if (local.includes(s)) return s.toUpperCase() as School;
  return 'GIST';
}

export function schoolOf(email: string): School | null {
  const t = testSchool(email.trim().toLowerCase());
  if (t) return t;
  const dom = email.trim().toLowerCase().split('@')[1] ?? '';
  for (const [d, s] of DOMAINS) if (dom === d || dom.endsWith('.' + d)) return s;
  return null;
}
export const SCHOOLS: School[] = ['KAIST', 'POSTECH', 'GIST', 'UNIST', 'DGIST', 'KENTECH'];

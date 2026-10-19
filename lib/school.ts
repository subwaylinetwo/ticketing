import type { School } from './api';

// DB의 school_of 와 같은 규칙 (dgist.ac.kr 이 gist.ac.kr 로 끝나는 것 주의)
const DOMAINS: [string, School][] = [
  ['gist.ac.kr', 'GIST'], ['dgist.ac.kr', 'DGIST'], ['kaist.ac.kr', 'KAIST'],
  ['postech.ac.kr', 'POSTECH'], ['unist.ac.kr', 'UNIST'], ['kentech.ac.kr', 'KENTECH'],
];

export function schoolOf(email: string): School | null {
  const dom = email.trim().toLowerCase().split('@')[1] ?? '';
  for (const [d, s] of DOMAINS) if (dom === d || dom.endsWith('.' + d)) return s;
  return null;
}
export const SCHOOLS: School[] = ['KAIST', 'POSTECH', 'GIST', 'UNIST', 'DGIST', 'KENTECH'];

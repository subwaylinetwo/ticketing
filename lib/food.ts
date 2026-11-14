// 어흐동 주문 — 화면에서 부르는 함수 모음 (로그인 없음)
import { supabase } from './supabase';

export type Taste = 'mild' | 'spicy';
export type MenuItem = { id: string; name: string; price: number; soldout: boolean };
export type Line = { id: string; name: string; price: number; qty: number; taste: Taste | null };
export type Status = 'pending' | 'paid' | 'ready' | 'done' | 'cancelled';
export type Order = {
  token: string; items: Line[]; subtotal: number; discount: number; amount: number; school: string | null;
  tag: string; status: Status; call_no: number | null; created_at: string; paid_at: string | null; ready_at: string | null;
  find_attempts_left: number; ahead: number | null;
};
export type Public = { menu: MenuItem[]; open: boolean; discount_school: string | null; discount_amount: number; waiting: number };

export const SCHOOLS = ['GIST', 'KAIST', 'POSTECH', 'UNIST', 'DGIST', 'KENTECH'] as const;
// 현수막 메뉴판과 같은 이름
export const TASTE: Record<Taste, { name: string; sub: string; short: string }> = {
  mild:  { name: '어흐~동',     sub: '일반맛', short: '일반' },
  spicy: { name: '어흐어흐~동', sub: '매운맛', short: '매운' },
};
export const INSTA = 'uh_heu_dong';
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const lineName = (l: Pick<Line, 'name' | 'taste'> & { id?: string }) =>
  l.taste ? `${l.id === 'udon_re' ? '재방문 ' : ''}${TASTE[l.taste].name} (${TASTE[l.taste].sub})` : l.name;

const MESSAGES: Record<string, string> = {
  closed: '지금은 주문을 받지 않아요. 부스에 물어봐 주세요.',
  empty_cart: '메뉴를 먼저 담아 주세요.',
  bad_item: '메뉴를 다시 골라 주세요.',
  bad_qty: '수량을 다시 확인해 주세요.',
  bad_pin: '번호가 틀렸어요.',
  order_not_pending: '이미 처리된 주문이에요.',
  deposit_already_used: '이미 다른 주문에 연결된 입금이에요.',
};
export function errText(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.startsWith('soldout:')) return `${m.slice(8)}이(가) 방금 다 팔렸어요.`;
  return MESSAGES[m] ?? '잠시 후 다시 해 주세요.';
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const food = {
  pub: () => rpc<Public>('food_public'),
  place: (items: { id: string; qty: number; taste?: Taste }[], school: string | null, name: string) =>
    rpc<Order>('food_place_order', { items, school, depositor_name: name }),
  order: (token: string) => rpc<Order | null>('food_order', { t: token }),
  cancel: (token: string) => rpc<Order>('food_cancel', { t: token }),
  find: (token: string, name: string) => rpc<{ result: string }>('food_find_deposit', { t: token, depositor_name: name }),
};

// ───────── 직원 ─────────
export type StaffOrder = {
  id: number; tag?: string; call_no?: number; amount?: number; items: Line[]; name?: string | null; school?: string | null;
  discount?: number; created_at?: string; paid_at?: string; ready_at?: string; method?: string;
};
export type Deposit = { id: number; name: string; amount: number; status: string; received_at: string; raw: string };
export type Board = {
  pending: StaffOrder[]; paid: StaffOrder[]; ready: StaffOrder[]; deposits: Deposit[]; menu: MenuItem[];
  settings: { open: boolean; discount_school: string | null; discount_amount: number };
  stats: { orders: number; revenue: number; bowls: number; odeng: number; mild: number; spicy: number };
};
export const staff = {
  board: (pin: string) => rpc<Board>('food_staff_board', { pin }),
  approve: (pin: string, order_id: number, deposit_id?: number) => rpc<boolean>('food_staff_approve', { pin, order_id, deposit_id: deposit_id ?? null }),
  set: (pin: string, order_id: number, status: Status) => rpc<boolean>('food_staff_set', { pin, order_id, status }),
  ignore: (pin: string, deposit_id: number) => rpc<boolean>('food_staff_ignore_deposit', { pin, deposit_id }),
  menu: (pin: string, item: string, soldout: boolean) => rpc<boolean>('food_staff_menu', { pin, item, soldout }),
  settings: (pin: string, s: { open?: boolean; discount_school?: string | null; clear_discount?: boolean }) =>
    rpc<boolean>('food_staff_settings', { pin, open: s.open ?? null, discount_school: s.discount_school ?? null, clear_discount: s.clear_discount ?? false }),
};

// 브라우저 저장소는 막혀 있을 수 있어서 항상 try
export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* 무시 */ } },
};
export async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
    } catch { return false; }
  }
}
export const minsAgo = (iso?: string | null) => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)) : 0;

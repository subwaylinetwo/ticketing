// 어흐동 장바구니: 화면을 옮겨 다녀도 유지 (sessionStorage, 막혀 있으면 메모리)
import { useSyncExternalStore } from 'react';
import type { Taste } from './food';

export type CartItem = { key: string; id: string; taste: Taste | null; qty: number };
const KEY = 'ef:cart';
let mem: CartItem[] = [];
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded) return; loaded = true;
  try { const raw = sessionStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch { /* 무시 */ }
}
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* 무시 */ }
  subs.forEach((f) => f());
}
export const keyOf = (id: string, taste?: Taste | null) => (taste ? `${id}:${taste}` : id);

export const cart = {
  add(id: string, taste: Taste | null, qty: number) {
    load(); const key = keyOf(id, taste);
    const hit = mem.find((x) => x.key === key);
    mem = hit ? mem.map((x) => (x.key === key ? { ...x, qty: Math.min(20, x.qty + qty) } : x)) : [...mem, { key, id, taste, qty: Math.min(20, qty) }];
    save();
  },
  set(key: string, qty: number) { load(); mem = qty <= 0 ? mem.filter((x) => x.key !== key) : mem.map((x) => (x.key === key ? { ...x, qty: Math.min(20, qty) } : x)); save(); },
  clear() { mem = []; save(); },
};

const EMPTY: CartItem[] = [];
export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => { load(); return mem; },
    () => EMPTY,
  );
}

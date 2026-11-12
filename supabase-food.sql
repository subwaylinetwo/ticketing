-- 어흐동 주문 (로그인 없음). 테이블은 RLS로 막고, 아래 함수로만 접근한다.
-- 직원 함수는 food_settings.pin 으로 확인한다.

create table if not exists public.food_menu (
  id      text primary key,
  name    text not null,
  price   int  not null check (price >= 0),
  sort    int  not null default 0,
  soldout boolean not null default false
);
insert into public.food_menu (id, name, price, sort) values
  ('udon',   '튀김우동',  5500, 1),
  ('odeng1', '어묵 1개',  1000, 2),
  ('odeng3', '어묵 3개',  2500, 3)
on conflict (id) do nothing;

create table if not exists public.food_settings (
  id              int primary key default 1 check (id = 1),
  pin             text not null,
  open            boolean not null default true,
  discount_school text,                       -- 이번 시간 어흐순위 꼴찌 학교
  discount_amount int not null default 1000   -- 우동 한 그릇당 할인
);
insert into public.food_settings (id, pin) values (1, '__PIN__') on conflict (id) do nothing;

create sequence if not exists public.food_call_seq start 1;

create table if not exists public.food_orders (
  id             bigint generated always as identity primary key,
  token          uuid not null default gen_random_uuid() unique,
  items          jsonb not null,               -- [{id,name,price,qty,taste?}]
  subtotal       int not null,
  discount       int not null default 0,
  amount         int not null check (amount > 0),
  school         text,
  depositor_name text,                         -- 번호를 못 적었을 때 찾기용 실명
  tag            text not null,                -- 입금자명으로 쓸 4자리 번호
  status         text not null default 'pending' check (status in ('pending','paid','ready','done','cancelled')),
  method         text,
  call_no        int,
  find_attempts  int not null default 0,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  ready_at       timestamptz,
  done_at        timestamptz
);
create index if not exists food_orders_status on public.food_orders (status, tag, amount);

alter table public.deposits add column if not exists order_id bigint references public.food_orders(id) on delete set null;

alter table public.food_menu     enable row level security;
alter table public.food_settings enable row level security;
alter table public.food_orders   enable row level security;

-- 30분 지난 입금 대기 주문은 취소 (번호 재사용 위해)
create or replace function public._food_expire() returns void
language sql security definer set search_path = public as $$
  update food_orders set status = 'cancelled' where status = 'pending' and created_at < now() - interval '30 minutes';
$$;

create or replace function public._food_tag() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  loop
    t := (1000 + floor(random() * 9000))::int::text;
    exit when not exists (select 1 from food_orders where status = 'pending' and tag = t)
          and not exists (select 1 from payments where status = 'pending' and depositor_tag = t);
  end loop;
  return t;
end $$;

create or replace function public._food_pay(oid bigint, how text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update food_orders set status = 'paid', paid_at = now(), method = how, call_no = nextval('food_call_seq')
   where id = oid and status = 'pending';
  return found;
end $$;

create or replace function public._food_view(o food_orders) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'token', o.token, 'items', o.items, 'subtotal', o.subtotal, 'discount', o.discount, 'amount', o.amount,
    'school', o.school, 'tag', o.tag, 'status', o.status, 'call_no', o.call_no,
    'created_at', o.created_at, 'paid_at', o.paid_at, 'ready_at', o.ready_at,
    'find_attempts_left', greatest(0, 5 - o.find_attempts),
    'ahead', case when o.status = 'paid'
      then (select count(*) from food_orders x where x.status = 'paid' and x.paid_at < o.paid_at) end);
$$;

-- 손님: 메뉴와 운영 상태
create or replace function public.food_public() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'menu', (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price, 'soldout', soldout) order by sort) from food_menu),
    'open', s.open, 'discount_school', s.discount_school, 'discount_amount', s.discount_amount,
    'waiting', (select count(*) from food_orders where status = 'paid'))
  from food_settings s where s.id = 1;
$$;

-- 손님: 주문 넣기. items = [{id, qty, taste?}]
create or replace function public.food_place_order(items jsonb, school text default null, depositor_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s food_settings; it jsonb; m food_menu; q int; taste text; lines jsonb := '[]'::jsonb;
        sub int := 0; bowls int := 0; disc int := 0; o food_orders;
begin
  perform _food_expire();
  select * into s from food_settings where id = 1;
  if not s.open then raise exception 'closed'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 10 then
    raise exception 'empty_cart'; end if;
  for it in select * from jsonb_array_elements(items) loop
    select * into m from food_menu where id = it->>'id';
    if not found then raise exception 'bad_item'; end if;
    if m.soldout then raise exception 'soldout:%', m.name; end if;
    q := coalesce((it->>'qty')::int, 0);
    if q < 1 or q > 20 then raise exception 'bad_qty'; end if;
    taste := null;
    if m.id = 'udon' then
      taste := coalesce(it->>'taste', 'mild');
      if taste not in ('mild','spicy') then raise exception 'bad_taste'; end if;
      bowls := bowls + q;
    end if;
    sub := sub + m.price * q;
    lines := lines || jsonb_build_object('id', m.id, 'name', m.name, 'price', m.price, 'qty', q, 'taste', taste);
  end loop;
  if school is not null and school = s.discount_school then disc := least(sub - 100, s.discount_amount * bowls); end if;
  insert into food_orders (items, subtotal, discount, amount, school, depositor_name, tag)
  values (lines, sub, disc, sub - disc, nullif(school, ''), nullif(left(trim(coalesce(depositor_name, '')), 20), ''), _food_tag())
  returning * into o;
  return _food_view(o);
end $$;

create or replace function public.food_order(t uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o food_orders;
begin
  perform _food_expire();
  select * into o from food_orders where token = t;
  if not found then return null; end if;
  return _food_view(o);
end $$;

create or replace function public.food_cancel(t uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o food_orders;
begin
  update food_orders set status = 'cancelled' where token = t and status = 'pending' returning * into o;
  if not found then select * into o from food_orders where token = t; end if;
  return _food_view(o);
end $$;

-- 손님: 번호를 안 적고 보냈을 때, 실명으로 찾기
create or replace function public.food_find_deposit(t uuid, depositor_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o food_orders; hits bigint[];
begin
  select * into o from food_orders where token = t and status = 'pending' for update;
  if not found then return jsonb_build_object('result', 'no_pending'); end if;
  if o.find_attempts >= 5 then return jsonb_build_object('result', 'too_many_attempts'); end if;
  update food_orders set find_attempts = find_attempts + 1 where id = o.id;
  select array_agg(id) into hits from deposits
   where status in ('unmatched','ambiguous') and amount = o.amount
     and received_at >= o.created_at - interval '10 minutes'
     and _norm_name(name) = _norm_name(depositor_name);
  if coalesce(cardinality(hits), 0) = 0 then return jsonb_build_object('result', 'not_found'); end if;
  if cardinality(hits) > 1 then return jsonb_build_object('result', 'ambiguous'); end if;
  update deposits set status = 'matched', order_id = o.id where id = hits[1];
  perform _food_pay(o.id, 'transfer');
  return jsonb_build_object('result', 'ok');
end $$;

-- 입금 문자 → 주문 먼저, 없으면 기존 티켓-팅 결제
create or replace function public.ingest_deposit(raw text, name text, amount integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tag text; hits bigint[]; ohits bigint[]; did bigint;
begin
  if exists (select 1 from deposits d where d.raw = ingest_deposit.raw and d.received_at > now() - interval '3 minutes') then
    return jsonb_build_object('result', 'duplicate');
  end if;
  v_tag := substring(_norm_name(name) from '([0-9]{4})$');
  if v_tag is not null then
    select array_agg(o.id) into ohits from food_orders o
     where o.status = 'pending' and o.tag = v_tag and o.amount = ingest_deposit.amount;
    if coalesce(cardinality(ohits), 0) = 0 then
      select array_agg(p.id) into hits from payments p
       where p.status = 'pending' and p.depositor_tag = v_tag and p.amount = ingest_deposit.amount;
    end if;
  end if;

  if cardinality(ohits) = 1 then
    insert into deposits (raw, name, amount, status, order_id) values (raw, name, amount, 'matched', ohits[1]) returning id into did;
    perform _food_pay(ohits[1], 'transfer');
    return jsonb_build_object('result', 'matched', 'deposit_id', did, 'order_id', ohits[1]);
  end if;

  insert into deposits (raw, name, amount, status, payment_id)
  values (raw, name, amount,
          case when cardinality(hits) = 1 then 'matched' when cardinality(hits) > 1 or cardinality(ohits) > 1 then 'ambiguous' else 'unmatched' end,
          case when cardinality(hits) = 1 then hits[1] end)
  returning id into did;
  if cardinality(hits) = 1 then
    perform _apply_payment(hits[1], null, 'transfer');
    return jsonb_build_object('result', 'matched', 'deposit_id', did, 'payment_id', hits[1]);
  end if;
  return jsonb_build_object('result', case when cardinality(hits) > 1 or cardinality(ohits) > 1 then 'ambiguous' else 'unmatched' end, 'deposit_id', did);
end $$;

-- ───────── 직원 (PIN) ─────────
create or replace function public._food_staff(pin text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from food_settings where id = 1 and food_settings.pin = _food_staff.pin) then
    raise exception 'bad_pin' using errcode = '42501';
  end if;
end $$;

create or replace function public.food_staff_board(pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform _food_staff(pin);
  perform _food_expire();
  select jsonb_build_object(
    'pending', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tag', tag, 'amount', amount, 'items', items, 'name', depositor_name,
                 'school', school, 'discount', discount, 'created_at', created_at) order by created_at)
               from food_orders where status = 'pending'), '[]'::jsonb),
    'paid',    coalesce((select jsonb_agg(jsonb_build_object('id', id, 'call_no', call_no, 'items', items, 'school', school, 'discount', discount,
                 'paid_at', paid_at, 'method', method) order by paid_at)
               from food_orders where status = 'paid'), '[]'::jsonb),
    'ready',   coalesce((select jsonb_agg(jsonb_build_object('id', id, 'call_no', call_no, 'items', items, 'ready_at', ready_at) order by ready_at)
               from food_orders where status = 'ready'), '[]'::jsonb),
    'deposits', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount', amount, 'status', status, 'received_at', received_at, 'raw', raw) order by received_at desc)
               from deposits where status in ('unmatched','ambiguous') and received_at > now() - interval '6 hours'), '[]'::jsonb),
    'menu', (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price, 'soldout', soldout) order by sort) from food_menu),
    'settings', (select jsonb_build_object('open', open, 'discount_school', discount_school, 'discount_amount', discount_amount) from food_settings where id = 1),
    'stats', (select jsonb_build_object(
        'orders',  count(*),
        'revenue', coalesce(sum(amount), 0),
        'bowls',   coalesce(sum((select coalesce(sum((e->>'qty')::int), 0) from jsonb_array_elements(items) e where e->>'id' = 'udon')), 0),
        'odeng',   coalesce(sum((select coalesce(sum((e->>'qty')::int * case e->>'id' when 'odeng3' then 3 else 1 end), 0) from jsonb_array_elements(items) e where e->>'id' like 'odeng%')), 0),
        'mild',    coalesce(sum((select coalesce(sum((e->>'qty')::int), 0) from jsonb_array_elements(items) e where e->>'taste' = 'mild')), 0),
        'spicy',   coalesce(sum((select coalesce(sum((e->>'qty')::int), 0) from jsonb_array_elements(items) e where e->>'taste' = 'spicy')), 0))
      from food_orders where status in ('paid','ready','done'))
  ) into r;
  return r;
end $$;

-- 수동 승인 (deposit_id 있으면 그 입금과 연결)
create or replace function public.food_staff_approve(pin text, order_id bigint, deposit_id bigint default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform _food_staff(pin);
  if deposit_id is not null then
    update deposits set status = 'matched', order_id = food_staff_approve.order_id
     where id = deposit_id and status in ('unmatched','ambiguous');
    if not found then raise exception 'deposit_already_used'; end if;
  end if;
  if not _food_pay(order_id, case when deposit_id is null then 'manual' else 'transfer' end) then
    raise exception 'order_not_pending';
  end if;
  return true;
end $$;

-- 상태 바꾸기: ready(조리 완료) / done(수령) / paid(되돌리기) / cancelled
create or replace function public.food_staff_set(pin text, order_id bigint, status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform _food_staff(pin);
  if status not in ('paid','ready','done','cancelled') then raise exception 'bad_status'; end if;
  update food_orders o set status = food_staff_set.status,
         ready_at = case when food_staff_set.status = 'ready' then now() else o.ready_at end,
         done_at  = case when food_staff_set.status = 'done'  then now() else o.done_at end
   where o.id = order_id;
  return found;
end $$;

create or replace function public.food_staff_ignore_deposit(pin text, deposit_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform _food_staff(pin);
  update deposits set status = 'ignored' where id = deposit_id and status in ('unmatched','ambiguous');
  return found;
end $$;

create or replace function public.food_staff_menu(pin text, item text, soldout boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform _food_staff(pin);
  update food_menu set soldout = food_staff_menu.soldout where id = item;
  return found;
end $$;

create or replace function public.food_staff_settings(pin text, open boolean default null, discount_school text default null, clear_discount boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform _food_staff(pin);
  update food_settings set
    open = coalesce(food_staff_settings.open, food_settings.open),
    discount_school = case when clear_discount then null else coalesce(food_staff_settings.discount_school, food_settings.discount_school) end
   where id = 1;
  return true;
end $$;

-- 권한: 내부 함수는 막고, 손님·직원 함수만 연다
revoke all on function public._food_expire(), public._food_tag(), public._food_pay(bigint, text), public._food_view(food_orders), public._food_staff(text) from public, anon, authenticated;
revoke all on function public.ingest_deposit(text, text, integer) from public, anon, authenticated;
grant execute on function public.food_public(), public.food_place_order(jsonb, text, text), public.food_order(uuid),
  public.food_cancel(uuid), public.food_find_deposit(uuid, text),
  public.food_staff_board(text), public.food_staff_approve(text, bigint, bigint), public.food_staff_set(text, bigint, text),
  public.food_staff_ignore_deposit(text, bigint), public.food_staff_menu(text, text, boolean),
  public.food_staff_settings(text, boolean, text, boolean)
  to anon, authenticated;

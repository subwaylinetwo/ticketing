-- ════════════════════════════════════════════════════════════════
-- 티켓-팅 DB (Supabase SQL Editor에 통째로 붙여 넣고 실행)
-- 모든 읽기·쓰기는 아래 함수(RPC)로만 한다. 테이블은 RLS로 잠가 둔다.
-- ════════════════════════════════════════════════════════════════

-- ── 0. 운영 설정 (한 줄짜리 표) ───────────────────────────────
create table public.settings (
  id               int primary key default 1 check (id = 1),
  join_fee         int not null default 2000,   -- 가입비
  join_hearts      int not null default 1,      -- 가입하면 주는 하트
  heart_price      int not null default 500,    -- 하트 1개 가격
  report_auto_hide int not null default 3,      -- 서로 다른 N명이 신고하면 자동 숨김
  event_ends_at    timestamptz,                 -- 행사 끝나는 시각 (정해지면 넣기)
  purge_after      interval not null default '7 days'
);
insert into public.settings default values;

-- ── 1. 표 ────────────────────────────────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  school            text not null check (school in ('KAIST','POSTECH','GIST','UNIST','DGIST','KENTECH')),
  gender            text not null check (gender in ('M','F')),
  nickname          text not null check (char_length(nickname) between 1 and 12),
  birth_year        int  not null check (birth_year between 1960 and 2010),
  height            int  check (height between 140 and 210),             -- 선택
  photos            text[] not null check (cardinality(photos) between 1 and 3), -- storage 경로
  intro             text check (char_length(intro) <= 40),
  spec              text check (char_length(spec) <= 30),
  personality       text[] not null default '{}' check (cardinality(personality) <= 3),
  interests         text[] not null default '{}' check (cardinality(interests) <= 3),
  ideal_personality text[] not null default '{}' check (cardinality(ideal_personality) <= 3),
  wants             text[] not null default '{}' check (cardinality(wants) <= 2),
  contact_type      text not null check (contact_type in ('instagram','phone')),
  contact           text not null check (char_length(contact) between 3 and 40),
  phone_last4       text not null check (phone_last4 ~ '^[0-9]{4}$'),    -- 입금자명 확인용, 전체 번호는 저장 안 함
  other_school_only boolean not null default true,
  paused            boolean not null default false,   -- 내 티켓 잠시 숨기기
  status            text not null default 'pending' check (status in ('pending','active','hidden')),
  hidden_reason     text,
  joined_at         timestamptz,                      -- 가입비 확인된 시각
  hearts            int not null default 0 check (hearts >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.profiles (status, gender, school);

create table public.hearts (
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index on public.hearts (to_id);

create table public.passes (
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);

create table public.payments (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles(id) on delete set null,  -- 탈퇴해도 매출 기록은 남김
  kind          text not null check (kind in ('join','hearts')),
  hearts        int  not null default 0,
  amount        int  not null check (amount >= 0),
  depositor_tag text not null,                      -- 입금자명으로 쓸 4자리 번호 (_new_tag)
  status        text not null default 'pending' check (status in ('pending','paid','cancelled')),
  method        text check (method in ('transfer','cash','free')),
  find_attempts int  not null default 0,            -- '입금자명으로 찾기' 시도 횟수
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  approved_by   uuid                                 -- 관리자가 승인했으면 관리자 id
);
create index on public.payments (status, depositor_tag, amount);
create unique index one_pending_payment_per_user on public.payments (user_id) where status = 'pending';

create table public.deposits (
  id          bigint generated always as identity primary key,
  raw         text not null,                         -- 알림 원문
  name        text not null,                         -- 통장에 찍힌 입금자명
  amount      int  not null,
  received_at timestamptz not null default now(),
  status      text not null check (status in ('matched','unmatched','ambiguous','ignored')),
  payment_id  bigint references public.payments(id) on delete set null
);
create index on public.deposits (status, amount);

create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (reason in ('photo','rude','fake','spam','minor','other')),
  detail      text check (char_length(detail) <= 300),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at  timestamptz not null default now(),
  handled_by  uuid,
  handled_at  timestamptz,
  unique (reporter_id, target_id)
);
create index on public.reports (target_id, status);

create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create table public.admin_log (
  id       bigint generated always as identity primary key,
  admin_id uuid not null,
  action   text not null,
  target   text,
  detail   jsonb,
  at       timestamptz not null default now()
);

-- 표는 전부 잠근다 (정책 없음 = 클라이언트 직접 접근 불가). 함수만 연다.
alter table public.settings  enable row level security;
alter table public.profiles  enable row level security;
alter table public.hearts    enable row level security;
alter table public.passes    enable row level security;
alter table public.payments  enable row level security;
alter table public.deposits  enable row level security;
alter table public.reports   enable row level security;
alter table public.admins    enable row level security;
alter table public.admin_log enable row level security;

-- ── 2. 공용 도우미 ───────────────────────────────────────────
create or replace function public.school_of(email text)
returns text language sql immutable as $$
  with d as (select lower(split_part(trim(email), '@', 2)) as dom)
  select case
    when dom = 'gist.ac.kr'    or dom like '%.gist.ac.kr'    then 'GIST'     -- gm.gist.ac.kr(학부), gist.ac.kr(대학원)
    when dom = 'dgist.ac.kr'   or dom like '%.dgist.ac.kr'   then 'DGIST'    -- dgist는 gist로 끝나므로 정확히 비교
    when dom = 'kaist.ac.kr'   or dom like '%.kaist.ac.kr'   then 'KAIST'
    when dom = 'postech.ac.kr' or dom like '%.postech.ac.kr' then 'POSTECH'
    when dom = 'unist.ac.kr'   or dom like '%.unist.ac.kr'   then 'UNIST'
    when dom = 'kentech.ac.kr' or dom like '%.kentech.ac.kr' then 'KENTECH'
  end from d;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public._require_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  return auth.uid();
end $$;

-- 두 사람 사이 '통하는 점' 수: viewer가 고른 것과 target이 가진 것이 겹치는 개수
create or replace function public._common(viewer public.profiles, target public.profiles)
returns int language sql immutable as $$
  select cardinality(array(select unnest(viewer.ideal_personality) intersect select unnest(target.personality)))
       + cardinality(array(select unnest(viewer.interests)         intersect select unnest(target.interests)))
       + cardinality(array(select unnest(viewer.wants)             intersect select unnest(target.wants)));
$$;

-- 이 사람이 나에게 보여도 되는지 (학교·성별·숨김·신고 조건)
create or replace function public._visible(me public.profiles, t public.profiles)
returns boolean language sql stable security definer set search_path = public as $$
  select t.id <> me.id
     and t.status = 'active'
     and t.gender <> me.gender
     and (not me.other_school_only or t.school <> me.school)
     and (not t.other_school_only  or t.school <> me.school)
     and not exists (select 1 from reports r where r.reporter_id = me.id and r.target_id = t.id)
     and not exists (select 1 from reports r where r.reporter_id = t.id and r.target_id = me.id);
$$;

create or replace function public._card(me public.profiles, t public.profiles)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', t.id, 'nickname', t.nickname, 'school', t.school,
    'age', extract(year from now())::int - t.birth_year,   -- 올해 - 출생연도 (생일 전이면 만 나이보다 1 많음)
    'birth_year', t.birth_year, 'height', t.height,
    'photos', to_jsonb(t.photos), 'intro', t.intro, 'spec', t.spec,
    'personality', to_jsonb(t.personality), 'interests', to_jsonb(t.interests), 'wants', to_jsonb(t.wants),
    -- 화면에서 주황으로 칠할 태그 = 내 이상형/관심사/하고 싶은 것과 겹치는 것
    'matching_tags', to_jsonb(array(
        select unnest(t.personality) intersect select unnest(me.ideal_personality)
        union select unnest(t.interests) intersect select unnest(me.interests)
        union select unnest(t.wants) intersect select unnest(me.wants))),
    'common', _common(me, t));
$$;

-- 결제 반영 (내부 전용). 이미 처리된 결제면 아무것도 안 함.
create or replace function public._apply_payment(pid bigint, by_admin uuid, how text)
returns boolean language plpgsql security definer set search_path = public as $$
declare p payments; s settings;
begin
  update payments set status = 'paid', paid_at = now(), method = how, approved_by = by_admin
   where id = pid and status = 'pending' returning * into p;
  if not found then return false; end if;
  select * into s from settings;
  if p.kind = 'join' then
    update profiles
       set status = case when status = 'pending' then 'active' else status end,
           joined_at = coalesce(joined_at, now()),
           hearts = hearts + s.join_hearts, updated_at = now()
     where id = p.user_id;
  else
    update profiles set hearts = hearts + p.hearts, updated_at = now() where id = p.user_id;
  end if;
  return true;
end $$;

create or replace function public._norm_name(n text)
returns text language sql immutable as $$ select regexp_replace(coalesce(n, ''), '\s', '', 'g') $$;

-- 입금자명으로 쓸 4자리 번호: 지금 대기 중인 결제끼리는 절대 겹치지 않게 뽑는다
create or replace function public._new_tag()
returns text language plpgsql volatile security definer set search_path = public as $$
declare t text;
begin
  loop
    t := (1000 + floor(random() * 9000))::int::text;
    exit when not exists (select 1 from payments where status = 'pending' and depositor_tag = t);
  end loop;
  return t;
end $$;

-- ── 3. 사용자 함수 ───────────────────────────────────────────
create or replace function public._me()
returns public.profiles language plpgsql stable security definer set search_path = public as $$
declare me profiles;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'no_profile'; end if;
  return me;
end $$;

-- 프로필 저장 (처음이면 가입비 결제 대기 생성)
create or replace function public.save_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sch text;
  em text;
  exists_ boolean;
  s settings;
  last4 text := right(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), 4);
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  -- 학교 메일로 로그인했으면 메일 도메인으로, 아니면(익명 로그인) 고른 학교로
  select email, school_of(email) into em, sch from auth.users where id = uid;
  if nullif(em, '') is not null and sch is null then raise exception 'not_school_email'; end if;  -- 메일로 들어왔으면 학교 메일이어야 함
  if sch is null then sch := nullif(p->>'school', ''); end if;                                    -- 익명 로그인(인증 끈 동안)만 직접 고름
  if sch is null or sch not in ('KAIST','POSTECH','GIST','UNIST','DGIST','KENTECH') then raise exception 'school_required'; end if;
  if (p->>'birth_year')::int > extract(year from now())::int - 19 then raise exception 'under_19'; end if;
  if not coalesce((p->>'agreed')::boolean, false) then raise exception 'consent_required'; end if;
  select * into s from settings;
  select true into exists_ from profiles where id = uid;
  -- 고칠 때 전화번호를 비우면 기존 뒷자리 유지, 처음 가입할 땐 필수
  if length(last4) <> 4 then
    select phone_last4 into last4 from profiles where id = uid;
    if last4 is null then raise exception 'phone_required'; end if;
  end if;

  insert into profiles as pr (id, school, gender, nickname, birth_year, height, photos, intro, spec,
                        personality, interests, ideal_personality, wants,
                        contact_type, contact, phone_last4, other_school_only)
  values (uid, sch, p->>'gender', trim(p->>'nickname'), (p->>'birth_year')::int, nullif(p->>'height','')::int,
          array(select jsonb_array_elements_text(p->'photos')), nullif(trim(p->>'intro'),''), nullif(trim(p->>'spec'),''),
          array(select jsonb_array_elements_text(coalesce(p->'personality','[]'))),
          array(select jsonb_array_elements_text(coalesce(p->'interests','[]'))),
          array(select jsonb_array_elements_text(coalesce(p->'ideal_personality','[]'))),
          array(select jsonb_array_elements_text(coalesce(p->'wants','[]'))),
          p->>'contact_type', regexp_replace(trim(p->>'contact'), '^@', ''), last4,
          coalesce((p->>'other_school_only')::boolean, true))
  on conflict (id) do update set
    gender = excluded.gender, nickname = excluded.nickname, birth_year = excluded.birth_year, height = excluded.height,
    photos = excluded.photos, intro = excluded.intro, spec = excluded.spec,
    personality = excluded.personality, interests = excluded.interests,
    ideal_personality = excluded.ideal_personality, wants = excluded.wants,
    contact_type = excluded.contact_type, contact = excluded.contact,
    phone_last4 = excluded.phone_last4,
    other_school_only = excluded.other_school_only, updated_at = now();

  if exists_ is null then
    insert into payments (user_id, kind, amount, depositor_tag)
    select uid, 'join', s.join_fee, _new_tag() from profiles where id = uid;
  end if;
  return my_state();
end $$;

-- 화면 맨 처음에 부르는 함수: 내 상태 한 번에
create or replace function public.my_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me profiles; pay payments;
begin
  select * into me from profiles where id = auth.uid();
  if not found then return jsonb_build_object('status', 'no_profile'); end if;
  select * into pay from payments where user_id = me.id and status = 'pending';
  return jsonb_build_object(
    'status', me.status, 'hidden_reason', me.hidden_reason,
    'nickname', me.nickname, 'school', me.school, 'photos', to_jsonb(me.photos),
    'hearts', me.hearts, 'paused', me.paused, 'other_school_only', me.other_school_only,
    'contact_type', me.contact_type, 'contact', me.contact,
    'depositor_tag', pay.depositor_tag,
    'pending_payment', case when pay.id is null then null else jsonb_build_object(
        'id', pay.id, 'kind', pay.kind, 'amount', pay.amount, 'hearts', pay.hearts,
        'created_at', pay.created_at, 'find_attempts_left', greatest(0, 5 - pay.find_attempts)) end,
    'received_open', (select count(*) from hearts h join profiles t on t.id = h.from_id
                       where h.to_id = me.id and t.status = 'active'
                         and not exists (select 1 from hearts b where b.from_id = me.id and b.to_id = h.from_id)),
    'matched', (select count(*) from hearts a join hearts b on b.from_id = a.to_id and b.to_id = a.from_id
                 join profiles t on t.id = a.to_id where a.from_id = me.id and t.status = 'active'));
end $$;

-- 내 티켓 고치기 화면용: 내 프로필 전체
create or replace function public.my_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me profiles;
begin
  me := _me();
  return jsonb_build_object(
    'school', me.school, 'gender', me.gender, 'nickname', me.nickname, 'birth_year', me.birth_year, 'height', me.height,
    'photos', to_jsonb(me.photos), 'intro', me.intro, 'spec', me.spec,
    'personality', to_jsonb(me.personality), 'interests', to_jsonb(me.interests),
    'ideal_personality', to_jsonb(me.ideal_personality), 'wants', to_jsonb(me.wants),
    'contact_type', me.contact_type, 'contact', me.contact, 'phone_last4', me.phone_last4,
    'other_school_only', me.other_school_only);
end $$;

create or replace function public.update_settings(other_school_only boolean default null, paused boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _me();
  update profiles set other_school_only = coalesce(update_settings.other_school_only, profiles.other_school_only),
                      paused = coalesce(update_settings.paused, profiles.paused), updated_at = now()
   where id = auth.uid();
  return my_state();
end $$;

-- 둘러보기: 다음 한 명
-- 순서: ① 나에게 하트 보낸 사람 ② 내가 고른 것과 겹치는 게 많은 사람 ③ 상대가 고른 것에 내가 많이 맞는 사람 ④ 무작위
create or replace function public.next_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me profiles; t profiles; got_heart boolean;
begin
  me := _me();
  if me.status <> 'active' then raise exception 'not_active'; end if;
  select x.* into t from profiles x
   where not x.paused and _visible(me, x)
     and not exists (select 1 from hearts h where h.from_id = me.id and h.to_id = x.id)
     and not exists (select 1 from passes p where p.from_id = me.id and p.to_id = x.id)
   order by exists (select 1 from hearts h where h.from_id = x.id and h.to_id = me.id) desc,
            _common(me, x) desc, _common(x, me) desc, random()
   limit 1;
  if not found then
    return jsonb_build_object('empty', true,
      'passed_count', (select count(*) from passes where from_id = me.id));
  end if;
  return _card(me, t);
end $$;

create or replace function public.pass_profile(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _me();
  insert into passes (from_id, to_id) values (auth.uid(), target) on conflict do nothing;
end $$;

-- '볼 사람 없음' 화면에서 넘겼던 사람 다시 보기
create or replace function public.reset_passes()
returns void language sql security definer set search_path = public as $$
  delete from passes where from_id = auth.uid();
$$;

-- 하트 보내기 (둘러보기에서든 받은 하트에서든 같은 함수)
create or replace function public.send_heart(target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; t profiles; mutual boolean;
begin
  select * into me from profiles where id = auth.uid() for update;   -- 동시에 두 번 눌러도 하트가 음수가 안 되게
  if not found then raise exception 'no_profile'; end if;
  if me.status <> 'active' then raise exception 'not_active'; end if;
  select * into t from profiles where id = target;
  if not found or not _visible(me, t) then raise exception 'unavailable'; end if;
  if exists (select 1 from hearts where from_id = me.id and to_id = target) then raise exception 'already_sent'; end if;
  if me.hearts < 1 then raise exception 'no_hearts'; end if;

  insert into hearts (from_id, to_id) values (me.id, target);
  update profiles set hearts = hearts - 1 where id = me.id;
  mutual := exists (select 1 from hearts where from_id = target and to_id = me.id);
  return jsonb_build_object('matched', mutual, 'hearts', me.hearts - 1,
    'partner', case when mutual then jsonb_build_object(
        'id', t.id, 'nickname', t.nickname, 'school', t.school, 'photo', t.photos[1],
        'contact_type', t.contact_type, 'contact', t.contact) end);
end $$;

-- 하트 목록: 보낸 하트(매칭된 사람이 맨 위) / 받은 하트(아직 답 안 한 사람이 위)
create or replace function public.my_hearts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me profiles;
begin
  me := _me();
  return jsonb_build_object(
    'sent', coalesce((
      select jsonb_agg(row order by (row->>'matched')::boolean desc, row->>'order_at' desc)
      from (
        select jsonb_build_object(
          'id', t.id, 'nickname', t.nickname, 'school', t.school, 'photo', t.photos[1],
          'sent_at', a.created_at, 'matched', b.from_id is not null,
          'order_at', greatest(a.created_at, b.created_at, a.created_at),
          'contact_type', case when b.from_id is not null then t.contact_type end,
          'contact',      case when b.from_id is not null then t.contact end) as row
        from hearts a
        join profiles t on t.id = a.to_id and t.status = 'active'
        left join hearts b on b.from_id = a.to_id and b.to_id = me.id
        where a.from_id = me.id) s), '[]'::jsonb),
    'received', coalesce((
      select jsonb_agg(row order by (row->>'matched')::boolean, row->>'received_at' desc)
      from (
        select jsonb_build_object(
          'id', t.id, 'nickname', t.nickname, 'school', t.school, 'photo', t.photos[1],
          'received_at', a.created_at, 'matched', b.from_id is not null, 'common', _common(me, t),
          'contact_type', case when b.from_id is not null then t.contact_type end,
          'contact',      case when b.from_id is not null then t.contact end) as row
        from hearts a
        join profiles t on t.id = a.from_id and t.status = 'active'
        left join hearts b on b.from_id = me.id and b.to_id = a.from_id
        where a.to_id = me.id
          and not exists (select 1 from reports r where r.reporter_id = me.id and r.target_id = t.id)) s), '[]'::jsonb));
end $$;

-- 받은 하트에서 누른 사람 프로필 자세히 보기 (나에게 하트 보낸 사람이거나 매칭된 사람만)
create or replace function public.view_profile(target uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me profiles; t profiles;
begin
  me := _me();
  select * into t from profiles where id = target;
  if not found or t.status <> 'active'
     or not exists (select 1 from hearts where (from_id = target and to_id = me.id) or (from_id = me.id and to_id = target))
  then raise exception 'unavailable'; end if;
  return _card(me, t);
end $$;

-- 하트 충전 신청 (1·3·5·10개). 대기 중인 다른 충전은 취소하고 새로 만든다.
create or replace function public.request_hearts(n int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; s settings;
begin
  me := _me();
  if me.status <> 'active' then raise exception 'not_active'; end if;
  if n not in (1, 3, 5, 10) then raise exception 'bad_pack'; end if;
  select * into s from settings;
  update payments set status = 'cancelled' where user_id = me.id and status = 'pending' and kind = 'hearts';
  insert into payments (user_id, kind, hearts, amount, depositor_tag)
  values (me.id, 'hearts', n, n * s.heart_price, _new_tag());
  return my_state();
end $$;

create or replace function public.cancel_heart_request()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update payments set status = 'cancelled' where user_id = auth.uid() and status = 'pending' and kind = 'hearts';
  return my_state();
end $$;

-- '입금자명이 달라요' → 통장에 찍힌 이름으로 다시 찾기
-- 조건: 아직 아무 결제에도 안 붙은 입금 중 이름·금액이 같고, 내 결제 신청 이후(10분 여유) 들어온 것이 딱 1건
create or replace function public.find_my_deposit(depositor_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; pay payments; hits bigint[];
begin
  me := _me();
  select * into pay from payments where user_id = me.id and status = 'pending' for update;
  if not found then return jsonb_build_object('result', 'no_pending'); end if;
  if pay.find_attempts >= 5 then return jsonb_build_object('result', 'too_many_attempts'); end if;
  update payments set find_attempts = find_attempts + 1 where id = pay.id;

  select array_agg(id) into hits from deposits
   where status in ('unmatched','ambiguous')
     and amount = pay.amount
     and received_at >= pay.created_at - interval '10 minutes'
     and _norm_name(name) = _norm_name(depositor_name);

  if coalesce(cardinality(hits), 0) = 0 then return jsonb_build_object('result', 'not_found'); end if;
  if cardinality(hits) > 1 then return jsonb_build_object('result', 'ambiguous'); end if;  -- 부스로 안내
  update deposits set status = 'matched', payment_id = pay.id where id = hits[1];
  perform _apply_payment(pay.id, null, 'transfer');
  return jsonb_build_object('result', 'ok', 'state', my_state());
end $$;

create or replace function public.report_user(target uuid, reason text, detail text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me profiles; n int; s settings;
begin
  me := _me();
  if target = me.id then raise exception 'self'; end if;
  insert into reports (reporter_id, target_id, reason, detail) values (me.id, target, reason, nullif(trim(detail), ''))
  on conflict (reporter_id, target_id) do nothing;
  select * into s from settings;
  select count(*) into n from reports where target_id = target and status = 'open';
  if n >= s.report_auto_hide then
    update profiles set status = 'hidden', hidden_reason = 'auto_reports', updated_at = now()
     where id = target and status = 'active';
  end if;
end $$;

-- 내 티켓 고치기 화면에서 기존 값 채우기
create or replace function public.my_profile()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'hearts' - 'status' - 'hidden_reason' - 'joined_at' - 'created_at' - 'updated_at'
  from profiles p where id = auth.uid();
$$;

-- 시작 화면 '지금 N명 참여 중' (로그인 전에도 보임)
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('active', (select count(*) from profiles where status = 'active'));
$$;

-- ── 4. 입금 알림 받기 (서버 전용: /api/deposit 에서 service_role 키로 호출) ───
create or replace function public.ingest_deposit(raw text, name text, amount int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare tag text; hits bigint[]; did bigint;
begin
  -- MacroDroid가 같은 알림을 두 번 보내는 경우 무시
  if exists (select 1 from deposits d where d.raw = ingest_deposit.raw and d.received_at > now() - interval '3 minutes') then
    return jsonb_build_object('result', 'duplicate');
  end if;
  tag := substring(_norm_name(name) from '([0-9]{4})$');
  if tag is not null then
    select array_agg(p.id) into hits from payments p
     where p.status = 'pending' and p.depositor_tag = tag and p.amount = ingest_deposit.amount;
  end if;
  insert into deposits (raw, name, amount, status, payment_id)
  values (raw, name, amount,
          case when cardinality(hits) = 1 then 'matched' when cardinality(hits) > 1 then 'ambiguous' else 'unmatched' end,
          case when cardinality(hits) = 1 then hits[1] end)
  returning id into did;
  if cardinality(hits) = 1 then
    perform _apply_payment(hits[1], null, 'transfer');
    return jsonb_build_object('result', 'matched', 'deposit_id', did, 'payment_id', hits[1]);
  end if;
  return jsonb_build_object('result', case when cardinality(hits) > 1 then 'ambiguous' else 'unmatched' end, 'deposit_id', did);
end $$;

-- ── 5. 관리자 함수 ───────────────────────────────────────────
create or replace function public._log(action text, target text, detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into admin_log (admin_id, action, target, detail) values (auth.uid(), action, target, detail);
$$;

-- 상단 숫자들 (몇 초마다 새로고침)
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return jsonb_build_object(
    'pending_payments', (select count(*) from payments where status = 'pending'),
    'open_deposits',    (select count(*) from deposits where status in ('unmatched','ambiguous')),
    'open_reports',     (select count(distinct target_id) from reports where status = 'open'),
    'active_users',     (select count(*) from profiles where status = 'active'),
    'hidden_users',     (select count(*) from profiles where status = 'hidden'),
    'matches',          (select count(*) from hearts a join hearts b on b.from_id = a.to_id and b.to_id = a.from_id where a.from_id < a.to_id),
    'revenue',          (select coalesce(sum(amount), 0) from payments where status = 'paid'));
end $$;

-- 결제 대기 목록 (뒷자리 또는 닉네임으로 검색)
create or replace function public.admin_payments(q text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'kind', p.kind, 'hearts', p.hearts, 'amount', p.amount, 'tag', p.depositor_tag,
      'created_at', p.created_at, 'find_attempts', p.find_attempts,
      'user_id', u.id, 'nickname', u.nickname, 'school', u.school, 'photo', u.photos[1]) order by p.created_at)
    from payments p join profiles u on u.id = p.user_id
    where p.status = 'pending'
      and (q is null or q = '' or p.depositor_tag = q or u.nickname ilike '%' || q || '%')), '[]'::jsonb);
end $$;

-- 자동으로 못 붙인 입금 목록
create or replace function public.admin_deposits()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', d.name, 'amount', d.amount, 'received_at', d.received_at, 'status', d.status, 'raw', d.raw,
      -- 금액이 같은 대기 결제를 후보로 같이 보여줌
      'candidates', (select coalesce(jsonb_agg(jsonb_build_object('payment_id', p.id, 'tag', p.depositor_tag, 'nickname', u.nickname, 'school', u.school,
                                                                  'tag_match', p.depositor_tag = substring(_norm_name(d.name) from '([0-9]{4})$'))
                                               order by (p.depositor_tag = substring(_norm_name(d.name) from '([0-9]{4})$')) desc nulls last, p.created_at), '[]'::jsonb)
                     from payments p join profiles u on u.id = p.user_id
                     where p.status = 'pending' and p.amount = d.amount)) order by d.received_at desc)
    from deposits d where d.status in ('unmatched','ambiguous')), '[]'::jsonb);
end $$;

-- 결제 승인: 입금과 연결(deposit_id) 하거나, 현금이면 deposit_id 없이 method='cash'
create or replace function public.admin_approve_payment(payment_id bigint, deposit_id bigint default null, method text default 'cash')
returns boolean language plpgsql security definer set search_path = public as $$
declare aid uuid := _require_admin(); ok boolean;
begin
  if deposit_id is not null then
    update deposits set status = 'matched', payment_id = admin_approve_payment.payment_id
     where id = deposit_id and status in ('unmatched','ambiguous');
    if not found then raise exception 'deposit_already_used'; end if;
    method := 'transfer';
  end if;
  ok := _apply_payment(payment_id, aid, method);
  if not ok then raise exception 'payment_not_pending'; end if;
  perform _log('approve_payment', payment_id::text, jsonb_build_object('deposit_id', deposit_id, 'method', method));
  return true;
end $$;

create or replace function public.admin_ignore_deposit(deposit_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update deposits set status = 'ignored' where id = deposit_id and status in ('unmatched','ambiguous');
  perform _log('ignore_deposit', deposit_id::text, null);
end $$;

-- 부스에서 현금으로 하트를 산 경우 (amount=0이면 무료 지급)
create or replace function public.admin_grant_hearts(user_id uuid, n int, amount int)
returns void language plpgsql security definer set search_path = public as $$
declare aid uuid := _require_admin(); pid bigint;
begin
  if n < 1 or n > 50 then raise exception 'bad_count'; end if;
  update payments set status = 'cancelled' where payments.user_id = admin_grant_hearts.user_id and status = 'pending' and kind = 'hearts';
  insert into payments (user_id, kind, hearts, amount, depositor_tag)
  select id, 'hearts', n, amount, _new_tag() from profiles where id = admin_grant_hearts.user_id
  returning id into pid;
  if pid is null then raise exception 'no_user'; end if;
  perform _apply_payment(pid, aid, case when amount = 0 then 'free' else 'cash' end);
  perform _log('grant_hearts', user_id::text, jsonb_build_object('n', n, 'amount', amount));
end $$;

-- 사용자 찾기: 닉네임, 뒷자리, 이메일 일부
create or replace function public.admin_users(q text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', u.id, 'nickname', u.nickname, 'school', u.school, 'gender', u.gender, 'photo', u.photos[1],
      'status', u.status, 'hidden_reason', u.hidden_reason, 'hearts', u.hearts, 'tag', u.phone_last4, 'email', a.email,
      'reports', (select count(*) from reports r where r.target_id = u.id and r.status = 'open'),
      'pending', (select jsonb_build_object('id', p.id, 'kind', p.kind, 'amount', p.amount) from payments p
                   where p.user_id = u.id and p.status = 'pending')) order by u.created_at desc)
    from profiles u join auth.users a on a.id = u.id
    where q is null or q = '' or u.nickname ilike '%' || q || '%' or u.phone_last4 = q or a.email ilike '%' || q || '%'
    limit 50), '[]'::jsonb);
end $$;

-- 신고 목록: 신고당한 사람별로 묶어서, 많이 신고된 순
create or replace function public.admin_reports()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return coalesce((select jsonb_agg(x order by (x->>'count')::int desc, x->>'last_at' desc) from (
    select jsonb_build_object(
      'target_id', t.id, 'nickname', t.nickname, 'school', t.school, 'photos', to_jsonb(t.photos),
      'intro', t.intro, 'status', t.status, 'hidden_reason', t.hidden_reason,
      'count', count(r.*), 'last_at', max(r.created_at),
      'items', jsonb_agg(jsonb_build_object('reason', r.reason, 'detail', r.detail, 'at', r.created_at,
                                            'reporter', rp.nickname, 'reporter_school', rp.school) order by r.created_at desc)) as x
    from reports r
    join profiles t  on t.id = r.target_id
    join profiles rp on rp.id = r.reporter_id
    where r.status = 'open'
    group by t.id) s), '[]'::jsonb);
end $$;

-- 숨기기 / 되돌리기. 처리하면 그 사람에 대한 열린 신고도 닫힌다.
create or replace function public.admin_set_hidden(user_id uuid, hide boolean, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare aid uuid := _require_admin();
begin
  if hide then
    update profiles set status = 'hidden', hidden_reason = coalesce(reason, 'admin'), updated_at = now()
     where id = user_id;
    update reports set status = 'actioned', handled_by = aid, handled_at = now()
     where target_id = user_id and status = 'open';
  else
    update profiles set status = case when joined_at is null then 'pending' else 'active' end,
                        hidden_reason = null, updated_at = now()
     where id = user_id and status = 'hidden';
    update reports set status = 'dismissed', handled_by = aid, handled_at = now()
     where target_id = user_id and status = 'open';
  end if;
  perform _log(case when hide then 'hide' else 'unhide' end, user_id::text, jsonb_build_object('reason', reason));
end $$;

create or replace function public.purge_due()
returns boolean language sql stable security definer set search_path = public as $$
  select event_ends_at is not null and now() >= event_ends_at + purge_after from settings;
$$;

-- 행사 끝나고 일주일 뒤 DB 정리 (사진 파일은 /api/cron/purge 가 먼저 지운다)
create or replace function public.purge_after_event()
returns text language plpgsql security definer set search_path = public as $$
declare s settings;
begin
  select * into s from settings;
  if s.event_ends_at is null or now() < s.event_ends_at + s.purge_after then return 'not_yet'; end if;
  delete from deposits; delete from reports; delete from hearts; delete from passes;
  update payments set user_id = null, depositor_tag = '****';   -- 매출 합계만 남김
  delete from auth.users where id not in (select user_id from admins);
  return 'purged';
end $$;

-- 시작 화면 '지금 N명 참여 중' (로그인 전에도 볼 수 있음)
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('active', (select count(*) from profiles where status = 'active'));
$$;

-- ── 6. 권한 ──────────────────────────────────────────────────
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.school_of(text), public.is_admin(),
  public.save_profile(jsonb), public.my_state(), public.my_profile(), public.update_settings(boolean, boolean),
  public.next_profile(), public.pass_profile(uuid), public.reset_passes(),
  public.send_heart(uuid), public.my_hearts(), public.view_profile(uuid),
  public.request_hearts(int), public.cancel_heart_request(), public.find_my_deposit(text),
  public.report_user(uuid, text, text), public.my_profile(),
  public.admin_overview(), public.admin_payments(text), public.admin_deposits(),
  public.admin_approve_payment(bigint, bigint, text), public.admin_ignore_deposit(bigint),
  public.admin_grant_hearts(uuid, int, int), public.admin_users(text), public.admin_reports(),
  public.admin_set_hidden(uuid, boolean, text)
to authenticated;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.ingest_deposit(text, text, int), public.purge_due(), public.purge_after_event() to service_role;

-- ── 7. 사진 저장소 (Storage) ─────────────────────────────────
-- 비공개 버킷. 자기 폴더(사용자id/파일)에만 올리고 지울 수 있고,
-- 가입비가 확인된 사람과 관리자만 다른 사람 사진을 볼 수 있다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: upload own" on storage.objects;
drop policy if exists "photos: delete own" on storage.objects;
drop policy if exists "photos: read" on storage.objects;
create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
         (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and status = 'active')));

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

revoke all on function public._new_tag() from public, anon, authenticated;

update public.payments set depositor_tag = public._new_tag() where status = 'pending';

select id, kind, amount, depositor_tag, status from public.payments where status='pending';

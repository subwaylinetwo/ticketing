-- 테스트 계정: settings.test_email_prefix 로 시작하는 Gmail(+태그)을 학교 메일로 인정
--   예) prefix='myname+'  →  myname+kaist@gmail.com = KAIST, myname+postech1@gmail.com = POSTECH, 태그에 학교가 없으면 GIST
-- 행사 전에 끄기: update public.settings set test_email_prefix = null;
alter table public.settings add column if not exists test_email_prefix text;

create or replace function public.school_of(email text)
returns text language sql stable security definer set search_path = public as $$
  with d as (select lower(trim(email)) as e, lower(split_part(trim(email), '@', 2)) as dom),
       t as (select nullif(lower(test_email_prefix), '') as pre from settings)
  select case
    when t.pre is not null and d.dom = 'gmail.com' and left(d.e, length(t.pre)) = t.pre then
      case when d.e ~ '^[^@]*kaist'   then 'KAIST'   when d.e ~ '^[^@]*postech' then 'POSTECH'
           when d.e ~ '^[^@]*unist'   then 'UNIST'   when d.e ~ '^[^@]*dgist'   then 'DGIST'
           when d.e ~ '^[^@]*kentech' then 'KENTECH' else 'GIST' end
    when d.dom = 'gist.ac.kr'    or d.dom like '%.gist.ac.kr'    then 'GIST'     -- gm.gist.ac.kr(학부), gist.ac.kr(대학원)
    when d.dom = 'dgist.ac.kr'   or d.dom like '%.dgist.ac.kr'   then 'DGIST'    -- dgist는 gist로 끝나므로 정확히 비교
    when d.dom = 'kaist.ac.kr'   or d.dom like '%.kaist.ac.kr'   then 'KAIST'
    when d.dom = 'postech.ac.kr' or d.dom like '%.postech.ac.kr' then 'POSTECH'
    when d.dom = 'unist.ac.kr'   or d.dom like '%.unist.ac.kr'   then 'UNIST'
    when d.dom = 'kentech.ac.kr' or d.dom like '%.kentech.ac.kr' then 'KENTECH'
  end from d, t;
$$;

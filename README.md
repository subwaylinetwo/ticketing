# 티켓-팅

STadium 과기원 연합체육대회 하루짜리 소개팅 부스 웹앱 (Next.js + Supabase)

## 처음 한 번
1. Supabase 대시보드 → SQL Editor → `supabase-schema.sql` 전체 붙여 넣고 Run
2. Authentication → Sign In / Providers → Email 켜기
3. Authentication → Emails → "Magic Link" 템플릿 본문에 `{{ .Token }}` 이 들어가게 바꾸기 (6자리 코드 메일)
4. Project Settings → API Keys 의 secret 키를 `.env.local` 의 `SUPABASE_SERVICE_ROLE_KEY=` 뒤에 넣기
5. `.env.local` 에 계좌·부스 위치 채우기
6. 운영진 지정 (운영진이 앱에서 한 번 로그인한 뒤):
   `insert into public.admins (user_id) select id from auth.users where email in ('메일1', '메일2');`
7. 행사 끝나는 시각: `update public.settings set event_ends_at = '2026-11-00 18:00+09';`

## 실행
    npm install
    npm run dev        # http://localhost:3000
    npm run build && npm start   # 실제 운영처럼

## 화면
- /start 시작 → /login 학교 메일 인증 → /ticket 티켓 만들기(4단계) → /pending 가입비 대기
- /browse 둘러보기(티켓 뜯기) · /hearts 하트 목록 · /charge 하트 충전 · /me 내 티켓 · /report/[id] 신고 · /hidden 숨김 안내
- /admin 운영진 (입금 · 신고 · 사용자)

## 입금 자동 승인 (MacroDroid)
트리거: 은행 앱 알림 → 동작: HTTP POST `https://배포주소/api/deposit`
헤더 `x-deposit-secret: (.env.local 의 DEPOSIT_SECRET)`, 본문 `{"text":"[notification]"}`

// 부스 운영 정보. .env.local 에서 바꾼다.
export const BOOTH = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME || '은행 미정',
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER || '예금주 미정',
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || '계좌 미정',
  location: process.env.NEXT_PUBLIC_BOOTH_LOCATION || '부스 위치 미정',
};
// true 로 바꾸면 학교 메일 인증 코드로 로그인 (메일 발송 문제 해결 후)
export const REQUIRE_SCHOOL_EMAIL = process.env.NEXT_PUBLIC_REQUIRE_SCHOOL_EMAIL === 'true';
export const HEART_PRICE = 500;
export const PACKS = [1, 3, 5, 10] as const;

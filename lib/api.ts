// 사용자 화면에서 쓰는 함수 모음. 화면 코드에서는 이것만 부르면 된다.
import { supabase } from './supabase';

export type School = 'KAIST' | 'POSTECH' | 'GIST' | 'UNIST' | 'DGIST' | 'KENTECH';
export type ContactType = 'instagram' | 'phone';

export type MyState =
  | { status: 'no_profile' }
  | {
      status: 'pending' | 'active' | 'hidden';
      hidden_reason: string | null;
      nickname: string; school: School; photos: string[];
      hearts: number; paused: boolean; other_school_only: boolean;
      contact_type: ContactType; contact: string; depositor_tag: string | null;
      pending_payment: null | {
        id: number; kind: 'join' | 'hearts'; amount: number; hearts: number;
        created_at: string; find_attempts_left: number;
      };
      received_open: number; matched: number;
    };

export type Card = {
  id: string; nickname: string; school: School; age: number; birth_year: number; height: number | null;
  photos: string[]; intro: string | null; spec: string | null;
  personality: string[]; interests: string[]; wants: string[];
  matching_tags: string[]; common: number;
};

export type HeartPerson = {
  id: string; nickname: string; school: School; photo: string;
  matched: boolean; contact_type: ContactType | null; contact: string | null;
  sent_at?: string; received_at?: string; common?: number;
};

export type ProfileInput = {
  gender: 'M' | 'F'; nickname: string; birth_year: number; height?: number | null;
  photos: string[];               // storage 경로 ("{uid}/1.jpg")
  intro?: string; spec?: string;
  personality: string[]; interests: string[]; ideal_personality: string[]; wants: string[];
  contact_type: ContactType; contact: string;
  phone?: string;                 // 뒷자리 4개만 저장됨. 수정할 때 비우면 기존 값 유지
  school?: School;                // 학교 메일 인증을 안 할 때만 씀 (처음 가입할 때)
  other_school_only: boolean; agreed: true;
};

// 서버 오류 코드 → 화면에 보여줄 문장
const MESSAGES: Record<string, string> = {
  not_signed_in: '다시 로그인해 주세요.',
  not_school_email: '6개 과기원 학교 메일만 쓸 수 있어요.',
  under_19: '만 19세 이상만 참여할 수 있어요.',
  consent_required: '개인정보 수집·이용에 동의해 주세요.',
  no_profile: '먼저 티켓을 만들어 주세요.',
  not_active: '가입비가 확인되면 쓸 수 있어요.',
  unavailable: '지금은 볼 수 없는 사람이에요.',
  already_sent: '이미 하트를 보냈어요.',
  no_hearts: '하트를 다 썼어요.',
  bad_pack: '충전 개수를 다시 골라 주세요.',
  self: '자기 자신은 신고할 수 없어요.',
  school_required: '학교를 골라 주세요.',
  phone_required: '전화번호를 입력해 주세요.',
};

export class ApiError extends Error {
  constructor(public code: string) { super(MESSAGES[code] ?? '잠시 후 다시 시도해 주세요.'); }
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k)) ?? 'unknown';
    throw new ApiError(code);
  }
  return data as T;
}

export type MyProfile = ProfileInput & { id: string; school: School; phone_last4: string; paused: boolean };

export const api = {
  myState:        () => call<MyState>('my_state'),
  myProfile:      () => call<MyProfile | null>('my_profile'),
  publicStats:    () => call<{ active: number }>('public_stats'),
  saveProfile:    (p: ProfileInput) => call<MyState>('save_profile', { p }),
  updateSettings: (s: { other_school_only?: boolean; paused?: boolean }) => call<MyState>('update_settings', s),

  nextProfile:    () => call<Card | { empty: true; passed_count: number }>('next_profile'),
  pass:           (target: string) => call<void>('pass_profile', { target }),
  resetPasses:    () => call<void>('reset_passes'),
  sendHeart:      (target: string) => call<{
                    matched: boolean; hearts: number;
                    partner: null | { id: string; nickname: string; school: School; photo: string; contact_type: ContactType; contact: string };
                  }>('send_heart', { target }),
  myHearts:       () => call<{ sent: HeartPerson[]; received: HeartPerson[] }>('my_hearts'),
  viewProfile:    (target: string) => call<Card>('view_profile', { target }),

  requestHearts:  (n: 1 | 3 | 5 | 10) => call<MyState>('request_hearts', { n }),
  cancelHearts:   () => call<MyState>('cancel_heart_request'),
  findMyDeposit:  (depositor_name: string) => call<{
                    result: 'ok' | 'not_found' | 'ambiguous' | 'no_pending' | 'too_many_attempts'; state?: MyState;
                  }>('find_my_deposit', { depositor_name }),

  report: (target: string, reason: 'photo' | 'rude' | 'fake' | 'spam' | 'minor' | 'other', detail?: string) =>
    call<void>('report_user', { target, reason, detail: detail ?? null }),

  async deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/delete-account', {
      method: 'POST', headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    if (!res.ok) throw new ApiError('unknown');
    await supabase.auth.signOut();
  },
};

// 사진: 비공개 버킷이라 서명된 주소로 보여준다 (1시간짜리, 여러 장 한 번에)
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

// 사진 올리기: 긴 변 1080px JPEG로 줄여서 올림 (현장 LTE 대비)
export async function uploadPhoto(file: File, slot: 1 | 2 | 3): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('not_signed_in');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1080 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((ok) => canvas.toBlob((b) => ok(b!), 'image/jpeg', 0.82));
  const path = `${user.id}/${slot}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new ApiError('unknown');
  return path;
}

// 은행 앱 입금 알림 문장에서 입금자명과 금액을 뽑는다.
// 은행마다 문장이 달라서, 못 읽으면 null을 돌려주고 원문은 관리자 화면 '확인 못 한 입금'으로 간다.
export type ParsedDeposit = { name: string; amount: number };

const AMOUNT_AFTER_IN = /입금\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*원?/;
const AMOUNT_WON = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*원/;
const NAME_WITH_TAG = /([가-힣A-Za-z]{0,10})\s?(?<![0-9])([0-9]{4})(?![0-9])/; // (은행 약칭·이름) + 입금 번호 4자리

export function parseDeposit(text: string): ParsedDeposit | null {
  text = text.normalize('NFKC');                              // 전각 숫자·공백(３８０６, 　) → 일반 문자
  if (!/입금|보냈|송금/.test(text)) return null;          // 출금·잔액 알림은 무시
  if (/출금|이체출금|결제/.test(text) && !/입금/.test(text)) return null;

  const body = text.replace(/잔액\s*[0-9,]+\s*원?/g, ' ');  // 잔액 숫자를 금액으로 착각하지 않게
  const m = body.match(AMOUNT_AFTER_IN) ?? body.match(AMOUNT_WON);
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // 금액 부분을 지우고 남은 데서 이름 찾기 (계좌번호 끝 4자리를 이름으로 오인하지 않도록 ** 들어간 토큰 제거)
  const rest = body.replace(m[0], ' ').replace(/\S*\*\S*/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\S*은행\s*\(\d+\)/g, ' ')
                   .replace(/[0-9]{1,2}\/[0-9]{1,2}|[0-9]{1,2}:[0-9]{2}/g, ' ');
  const tagged = rest.match(NAME_WITH_TAG);
  if (tagged) return { name: tagged[1] + tagged[2], amount };

  const plain = rest.replace(/입금|님이|님|보냈어요|보냈습니다|원|에게|으로|이체|송금/g, ' ')
                    .match(/[가-힣]{2,10}/g);
  // "토뱅 이호선"처럼 보낸 은행 약칭이 앞에 오므로 마지막 한글 덩어리를 이름으로 본다
  return plain ? { name: plain[plain.length - 1], amount } : { name: '', amount };
}

// 구글 스프레드시트 → 확장 프로그램 → Apps Script 에 이 코드를 그대로 붙여넣습니다.
// 아래 SECRET 값은 Vercel 환경변수 PARTY_SECRET 과 같아야 합니다.
// 추가: 현장 도슨트 예약(action: 'docent') → '도슨트 예약' 탭에 기록. 붙여넣은 뒤 [배포 → 배포 관리 → 수정 → 새 버전]으로 다시 배포하면 주소는 그대로입니다.
// 변경점: 'MBTI' 뒤에 '유입 경로' 열 추가. ('거주지' 뒤 '관심사', 'MBTI' 열 추가 포함) 기존 시트는 첫 호출 때 자동으로 열이 끼워 넣어집니다(기존 행 유지).

const SECRET = 'shootingmythingsnettwork1380f24j0f429jw-9';
const SHEET = '신청';
const HEAD = ['신청일시', '이름', '연락처', '생년월일', '직업', '거주지', '관심사', 'MBTI', '유입 경로', '환불 은행', '환불 계좌번호', '환불 예금주', '입금자명', '입금 확인', '참석 확인', '환불 완료'];
const CHECK_COL = 14; // '입금 확인' 열 번호 (1부터), 이후 3칸이 체크박스

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEAD); sh.setFrozenRows(1); return sh; }
  // 기존 시트(13열)라면 '거주지'(6열) 뒤에 두 열을 끼워 넣습니다.
  if (String(sh.getRange(1, 7).getValue()) !== '관심사') {
    sh.insertColumnsAfter(6, 2);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  }
  // 'MBTI'(8열) 뒤에 '유입 경로' 열을 끼워 넣습니다(기존 행 유지).
  if (String(sh.getRange(1, 9).getValue()) !== '유입 경로') {
    sh.insertColumnsAfter(8, 1);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function count_(sh) { return Math.max(0, sh.getLastRow() - 1); }

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'invalid' }); }
  if (b.secret !== SECRET) return out_({ ok: false, error: 'auth' });
  const sh = sheet_();
  if (b.action === 'docent') return docent_(b.row || {});
  if (b.action === 'count') return out_({ count: count_(sh) });
  if (b.action !== 'apply') return out_({ ok: false, error: 'invalid' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const n = count_(sh);
    if (n >= (b.max || 35)) return out_({ ok: false, error: 'full', count: n });
    const r = b.row;
    const phone = String(r.phone).replace(/\D/g, '');
    if (n > 0) {
      const phones = sh.getRange(2, 3, n, 1).getValues().map(v => String(v[0]).replace(/\D/g, ''));
      if (phones.indexOf(phone) !== -1) return out_({ ok: false, error: 'dup', count: n });
    }
    // 앞에 ' 를 붙여 연락처·계좌가 숫자로 바뀌지 않게 합니다.
    sh.appendRow([new Date(), r.name, "'" + r.phone, "'" + r.birth, r.job, r.area, r.interest || '', r.mbti || '', r.source || '', r.bank, "'" + r.acct, r.holder, r.payer, false, false, false]);
    const last = sh.getLastRow();
    sh.getRange(last, CHECK_COL, 1, 3).insertCheckboxes();
    return out_({ ok: true, count: n + 1 });
  } finally {
    lock.releaseLock();
  }
}

const DOCENT_SHEET = '도슨트 예약';
const NOTIFY_TO = 'contact@shootingmythings.studio,project@lectus.kr'; // 예약 알림 받을 메일 (여러 명이면 쉼표로)
const DOCENT_HEAD = ['신청일시', '희망 날짜', '희망 시간', '성함', '연락처', '요청사항', '기타', '확정 연락'];
function docent_(r) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(DOCENT_SHEET);
  if (!sh) { sh = ss.insertSheet(DOCENT_SHEET); sh.appendRow(DOCENT_HEAD); sh.setFrozenRows(1); }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const n = Math.max(0, sh.getLastRow() - 1);
    const phone = String(r.phone || '').replace(/\D/g, '');
    if (n > 0) {
      const rows = sh.getRange(2, 2, n, 4).getDisplayValues();
      if (rows.some(v => v[0] === r.date && v[1] === r.time && String(v[3]).replace(/\D/g, '') === phone)) return out_({ ok: false, error: 'dup' });
    }
    sh.appendRow([new Date(), "'" + r.date, "'" + r.time, r.name, "'" + r.phone, r.request || '', r.etc || '', false]);
    sh.getRange(sh.getLastRow(), 8).insertCheckboxes();
    try {
      const body = ['새 현장 도슨트 예약이 들어왔습니다.', '', '희망 일시: ' + r.date + ' ' + r.time, '성함: ' + r.name, '연락처: ' + r.phone, '요청사항: ' + (r.request || '-'), '기타: ' + (r.etc || '-'), '', '시트 열기: ' + ss.getUrl() + '#gid=' + sh.getSheetId()].join('\n');
      MailApp.sendEmail({ to: NOTIFY_TO, subject: '[도슨트 예약] ' + r.date.slice(5).replace('-', '/') + ' ' + r.time + ' · ' + r.name, body: body, name: '나의 동네, 낯선 동네' });
    } catch (err) {}
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

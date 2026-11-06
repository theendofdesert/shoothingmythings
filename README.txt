GitHub 업로드 — 최종본 (2026-11-06)

저장소 루트 기준으로 같은 경로에 그대로 덮어쓰기 하세요.

index.html              메인 (한/EN/日 · 메뉴 버튼 · 기간 연장 팝업 · 관람 안내 · 애프터 파티 · 옴니고딕 날짜)
i18n.js                 메인 다국어 문구 (index.html과 같은 위치)
docent/index.html       음성 해설 페이지 (언어 버튼을 재생 바 위 가운데로 이동)
docent/audio/           해설 음성 파일 (한/영)
reserve/index.html      현장 도슨트 예약 신청서
networking/index.html   /networking → 메인 애프터 파티 섹션으로 이동
api/docent.js           예약 접수 → 시트·메일 전송 (Vercel 함수)
assets/                 QR, OG 이미지, 사진
apps-script/Code.gs     Google Apps Script (저장소 업로드 X — 시트 스크립트 편집기에 붙여넣기용)

배포 후
- 카카오톡 미리보기가 예전 그대로면 카카오 공유 디버거에서 캐시 초기화
- 옴니고딕은 shootingmythings.studio 도메인에서만 적용됩니다

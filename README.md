# 「나의 동네, 낯선 동네」 온라인 초청장

사이트: https://www.shootingmythings.studio
저장소: theendofdesert/shoothingmythings (GitHub) → Vercel 자동 배포

## 폴더 구조
- `index.html` — 초청장 페이지 전체 (디자인·문구·동작 모두 이 파일 하나)
- `support.js` — 페이지 실행 파일 (수정하지 않음)
- `assets/layers/` — 포스터 인트로 레이어 19장
- `assets/works/` — 대표 작품 9장 (01–09, 소개말 장면 배경)
- `assets/team/` — 팀 로고(logo-smt, logo-gd, with), 후원사 로고(logo-seongbuk-center, logo-lectus)
- `assets/poster.jpg` — 공유 버튼의 '포스터 저장' 이미지
- `og.jpg` — 카카오톡·SNS 미리보기 썸네일 (1200×630)
- `api/guestbook.js` — 방명록 API (GitHub `guestbook` 브랜치에 저장)
- `api/party.js` — 네트워킹 신청 API (구글 시트로 전달)
- `robots.txt`, `sitemap.xml`, `llms.txt` — 검색엔진·AI 검색용
- `vercel.json` — 배포 설정

## 페이지 구성 (index.html)
1. 포스터 인트로 (스크롤에 따라 레이어 적층)
2. 전시소개 (id=intro) — 작품 사진 9장이 화면 가득 넘어가며 문단이 하나씩 등장, 흑백 → 컬러
3. 팀소개 (id=team) — 두 로고가 만남 → 슈마띵 소개 → 왼쪽으로 넘어가며 가꾸가 소개
4. 후원 — 지원 문구 + 서울청년센터 성북 · LECTUS 로고
5. 네트워킹 (id=party) — 찢긴 초대장이 열림 → 소개글 → 세션 안내 → 일시·개요, 하단에 남은 자리 + 신청하기 고정 (4단계 신청 창은 그대로)
6. 관람 안내 (id=visit)
7. 방명록 (id=guestbook)

고정 요소
- 상단 바: 포스터를 지나면 등장 (전시소개 · 팀소개 · 네트워킹 · 관람안내 · 방명록). 메뉴별 밑줄이 섹션 진행도를 표시, 네트워킹 위 '모집중' 표시(마감 시 자동 숨김)
- 우측 하단 공유 버튼: '포스터 저장' · '공유하기'

인앱 브라우저 대응
- 화면 높이를 처음 연 시점 기준으로 고정(--vh)해 카카오톡·인스타그램에서 스크롤 위치가 튀지 않음
- 작은 화면에서는 팀소개·초대장 안내가 화면에 맞게 자동 축소

## Vercel 환경변수 (값은 Vercel에만 저장, 여기에 적지 않음)
- `GITHUB_TOKEN` — Fine-grained 토큰, 이 저장소만, Contents: Read and write
- `GITHUB_REPO` — `theendofdesert/shoothingmythings`
- `PARTY_SCRIPT_URL` — Apps Script 웹앱 주소 (`.../exec`)
- `PARTY_SECRET` — Apps Script `SECRET` 과 같은 값

환경변수를 바꾸면 Deployments → ⋯ → Redeploy 해야 적용됩니다.

## 점검 주소
- 방명록: /api/guestbook?check=1  → `branchReady: true` 면 정상
- 신청: /api/party?check=1  → `secretOk: true`, `count` 숫자 나오면 정상

## 네트워킹 신청 설정
- 정원 표시 30명, 실제 접수 35명까지 (`api/party.js` MAX, index.html P_SHOW / P_MAX)
- 마감 2026-11-05 23:59 KST (`api/party.js` END, index.html P_END)
- 입금 계좌: 토스뱅크 1002-2068-4620 강태훈(Shootingmythings)
- 구글 시트 코드(google-apps-script.gs)는 비밀값이 들어가므로 저장소에 올리지 않습니다.
  코드를 고치면 Apps Script에서 배포 → 배포 관리 → 연필 → 새 버전 → 배포 (주소 유지).

## 수정 후 반영
바뀐 파일만 저장소 같은 위치에 덮어쓰고 커밋하면 1분 안에 자동 배포됩니다.
카카오톡 미리보기를 바꿨다면 developers.kakao.com → 도구 → 공유 디버거에서 캐시 초기화.

## 다음에 수정 요청할 때
이 폴더 전체(또는 index.html)와 이 README를 함께 보여주면 바로 이어서 수정할 수 있습니다.

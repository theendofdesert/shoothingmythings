# 낯선동네 나의동네 — 온라인 초청장

정적 페이지(index.html) + 방명록 API(api/guestbook.js) 구성입니다. 빌드 과정 없이 그대로 배포됩니다.

## 폴더 구조
- `index.html` — 초청장 페이지
- `support.js` — 페이지 실행 파일 (수정하지 않음)
- `assets/` — 포스터 레이어, 대표 작품 이미지
- `api/guestbook.js` — 방명록 저장 API
- `vercel.json` — 배포 설정

## 1. GitHub에 올리기
1. GitHub에서 새 저장소 생성 (예: `invitation`, Private 권장)
2. 이 폴더 안의 파일 전체를 업로드 (웹에서 드래그 앤 드롭 또는 GitHub Desktop)

## 2. 방명록용 토큰 만들기
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access: **Only select repositories** → 위 저장소 선택
3. Permissions → Repository permissions → **Contents: Read and write**
4. 생성된 토큰을 복사해 둡니다 (다시 볼 수 없음)

## 3. Vercel 배포
1. vercel.com → Add New → Project → 위 저장소 Import
2. Framework Preset: **Other**, Build/Output 설정은 비워 둠
3. Environment Variables 에 추가
   - `GITHUB_TOKEN` = 2번에서 만든 토큰
   - `GITHUB_REPO` = `GitHub아이디/저장소이름` (예: `lectus/invitation`)
4. Deploy

## 4. 도메인 연결
1. Vercel 프로젝트 → Settings → Domains → 구매한 도메인 입력
2. 화면에 나오는 DNS 값을 도메인 구매처(가비아, 후이즈 등) DNS 설정에 입력
   - 루트 도메인(example.com): A 레코드 `76.76.21.21`
   - www: CNAME `cname.vercel-dns.com`
3. 반영까지 수 분~수 시간

## 방명록 저장 방식
- 방문자가 글을 남기면 저장소의 `guestbook` 브랜치에 `data/guestbook.json` 으로 커밋됩니다.
- 첫 글이 등록될 때 브랜치가 자동 생성됩니다.
- `guestbook` 브랜치는 `vercel.json` 에서 배포 대상에서 제외되어 있어, 글이 올라와도 재배포되지 않습니다.
- 글 삭제: GitHub에서 `guestbook` 브랜치 → `data/guestbook.json` 을 열어 해당 항목을 지우고 커밋합니다.
- 이름 20자, 메시지 200자 제한, 최근 1,000개까지 보관합니다.

## 페이지 수정 후 반영
프로젝트에서 수정한 `전시 초청장.dc.html` 을 `index.html` 로 이름을 바꿔 덮어쓰고 커밋하면 자동 재배포됩니다.

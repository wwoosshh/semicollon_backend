# semicollon-backend

세미콜론 동아리 홈페이지 백엔드 (NestJS + Prisma + Supabase).

## 개발

- `npm install` 후 `.env.example`을 `.env`로 복사해 값 채우기
- `npm run start:dev` — 개발 서버 (기본 포트 4000)
- `npx jest` — 테스트
- 스키마가 바뀌면(db 저장소에 마이그레이션 추가 시): `npx prisma db pull` 후 `npx prisma generate`

## API

**공개**

| 메서드/경로 | 설명 |
|---|---|
| GET /health | 헬스체크 |
| GET /settings/recruit | 모집 기간·모집 중 여부 |
| GET /settings/about | 소개 콘텐츠 (연혁/운영진/FAQ) |
| POST /auth/signup | 초대 코드 가입 |
| GET /posts, GET /posts/:id | 게시판 (토큰 있으면 member 글 포함) |
| GET /posts/:id/comments | 댓글 목록 (글 공개범위 따름) |
| GET /activities, /activities/:id | 활동 목록(?type=)/상세 |
| GET /events | 일정 목록 (?from=&to= ISO 범위) |
| POST /applications | 지원서 제출 (모집 기간 내만) |

**부원 (Bearer)**

| 메서드/경로 | 설명 |
|---|---|
| GET /me | 내 프로필 |
| POST /posts | 글 작성 (공지 카테고리는 admin만) |
| PATCH·DELETE /posts/:id | 글 수정/삭제 (작성자 또는 admin) |
| POST /posts/:id/comments | 댓글 작성 |
| DELETE /comments/:id | 댓글 삭제 (작성자 또는 admin) |
| POST /uploads | 이미지 업로드 (multipart 'file', 5MB·이미지만) |

**관리자 (Bearer + admin)**

| 메서드/경로 | 설명 |
|---|---|
| GET /admin/applications | 지원자 목록 (?status=) |
| PATCH /admin/applications/:id/status | 지원 상태 변경 |
| GET /admin/members | 부원 목록 (이메일 포함) |
| PATCH /admin/members/:id/role | 역할 변경 (자기 자신 불가) |
| DELETE /admin/members/:id | 부원 삭제 — auth 계정까지 영구 삭제 (자기 자신 불가) |
| PATCH /admin/settings/recruit | 모집 기간 설정 |
| PATCH /admin/settings/invite-code | 초대 코드 변경 |
| PATCH /admin/settings/about | 소개 콘텐츠(연혁/운영진/FAQ) 수정 |
| POST·PATCH·DELETE /activities | 활동 등록/수정/삭제 |
| POST·PATCH·DELETE /events | 일정 등록/수정/삭제 |

## 캐싱 (Redis — 선택)

`REDIS_URL` 설정 시 활성화되며, 없거나 장애여도 DB 폴백으로 정상 동작한다.

| 키 | TTL | 무효화 |
|---|---|---|
| `setting:{key}` | 5분 | 관리자 설정 변경 시 |
| `profile-role:{userId}` | 60초 (없음은 15초) | 역할 변경·부원 삭제 시 |
| `posts:public:{category}` | 30초 | 글 작성/수정/삭제 시 |
| `activities:{type}` | 30초 | 활동 변경 시 |

## 인증 구조

- 프론트가 Supabase Auth로 로그인 → JWT를 `Authorization: Bearer`로 전달
- `AuthGuard`: Supabase JWKS(ES256)로 JWT 서명·발급자·대상 검증 → `req.user.id`
- `RolesGuard` + `@Roles('admin')`: DB의 `profiles.role` 기준으로 권한 검사

## 배포 (Railway)

- GitHub `semicollon_backend` 저장소를 Railway에 연결하면 railway.json이 빌드/시작 명령을 정의
- 환경변수: `.env.example`의 모든 키를 Railway Variables에 설정 (`REDIS_URL`은 Redis 서비스 추가 시 자동 주입; 없으면 캐시 없이 동작)
- 헬스체크: `GET /health`

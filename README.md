# semicollon-backend

세미콜론 동아리 홈페이지 백엔드 (NestJS + Prisma + Supabase).

## 개발

- `npm install` 후 `.env.example`을 `.env`로 복사해 값 채우기
- `npm run start:dev` — 개발 서버 (기본 포트 4000)
- `npx jest` — 테스트
- 스키마가 바뀌면(db 저장소에 마이그레이션 추가 시): `npx prisma db pull` 후 `npx prisma generate`

## API

| 메서드/경로 | 권한 | 설명 |
|---|---|---|
| GET /health | 공개 | 헬스체크 |
| GET /settings/recruit | 공개 | 모집 기간·모집 중 여부 |
| POST /auth/signup | 공개 | 초대 코드 가입 |
| GET /me | 부원 | 내 프로필 |
| GET /posts, GET /posts/:id | 공개(부원은 member 글 포함) | 게시판 목록/상세 |
| POST /posts | 부원(공지는 admin) | 글 작성 |
| PATCH·DELETE /posts/:id | 작성자 또는 admin | 글 수정/삭제 |
| GET /activities, /activities/:id | 공개 | 활동 목록/상세 |
| POST·PATCH·DELETE /activities | admin | 활동 관리 |
| POST /applications | 공개(모집 기간 내) | 지원서 제출 |
| GET /admin/applications | admin | 지원자 목록 |
| PATCH /admin/applications/:id/status | admin | 지원 상태 변경 |
| PATCH /admin/settings/recruit | admin | 모집 기간 설정 |
| PATCH /admin/settings/invite-code | admin | 초대 코드 변경 |
| POST /uploads | 부원 | 이미지 업로드 (5MB, 이미지만) |

## 인증 구조

- 프론트가 Supabase Auth로 로그인 → JWT를 `Authorization: Bearer`로 전달
- `AuthGuard`: Supabase JWKS(ES256)로 JWT 서명·발급자·대상 검증 → `req.user.id`
- `RolesGuard` + `@Roles('admin')`: DB의 `profiles.role` 기준으로 권한 검사

## 배포 (Railway)

- GitHub `semicollon_backend` 저장소를 Railway에 연결하면 railway.json이 빌드/시작 명령을 정의
- 환경변수: `.env.example`의 모든 키를 Railway Variables에 설정 (`REDIS_URL`은 Redis 서비스 추가 시 자동 주입; 없으면 캐시 없이 동작)
- 헬스체크: `GET /health`

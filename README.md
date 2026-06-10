# semicollon-backend

세미콜론 동아리 홈페이지 백엔드 (NestJS + Prisma + Supabase).

## 개발

- `npm install` 후 `.env.example`을 `.env`로 복사해 값 채우기
- `npm run start:dev` — 개발 서버 (기본 포트 4000)
- `npx jest` — 테스트
- 스키마가 바뀌면(db 저장소에 마이그레이션 추가 시): `npx prisma db pull` 후 `npx prisma generate`

## 인증 구조

- 프론트가 Supabase Auth로 로그인 → JWT를 `Authorization: Bearer`로 전달
- `AuthGuard`: Supabase JWKS(ES256)로 JWT 서명·발급자·대상 검증 → `req.user.id`
- `RolesGuard` + `@Roles('admin')`: DB의 `profiles.role` 기준으로 권한 검사

## 배포 (Railway)

- GitHub `semicollon_backend` 저장소를 Railway에 연결하면 railway.json이 빌드/시작 명령을 정의
- 환경변수: `.env.example`의 모든 키를 Railway Variables에 설정
- 헬스체크: `GET /health`

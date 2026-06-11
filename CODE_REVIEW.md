# 백엔드 전체 코드리뷰 결과 (안정성 · 최적화)

> 작성일: 2026-06-11
> 대상: NestJS 11 + Prisma 7 (@prisma/adapter-pg) + Supabase (Auth/Storage) + ioredis, Railway 배포
> 범위: `src/` 전체, `prisma/schema.prisma`, `prisma.config.ts`, `railway.json`, 배포 설정
> ✅검증 표시 = 코드를 직접 재확인한 항목

## 총평

전반적으로 잘 작성된 코드베이스. 인증 흐름(Supabase JWT + JWKS 검증, 역할 가드), 캐시 실패 시 DB 폴백(`CacheService`가 Redis 오류를 삼키고 null 반환), mimetype 기반 확장자 결정(spoofing 방지), 가입 실패 시 고아 auth 유저 보상 삭제 등은 잘 설계되어 있음. 치명적인 인증 우회 취약점은 없음.

다만 **운영 환경에서 실제로 터질 수 있는 안정성 이슈 5건**과 권한·캐시 정합성 관련 이슈 다수 발견.

참고: `error.txt`의 Railway 빌드 실패(`DATABASE_URL` 미해결)는 현재 `prisma.config.ts:12-14`에 플레이스홀더 폴백이 이미 들어가 있어 **해결된 과거 이력**으로 판단됨.

---

## 🔴 Critical — 운영 중 실제 장애 가능

### C-1. 업로드 파일이 크기 검사 전에 통째로 메모리에 적재됨 ✅검증

- **위치:** `src/uploads/uploads.controller.ts:19`
- **문제:** `FileInterceptor('file')`에 multer `limits`가 없어 기본 메모리 스토리지로 파일 전체가 RAM에 올라간 **후에야** 서비스(`uploads.service.ts:23`)의 5MB 검사가 실행됨. `main.ts`의 `json({ limit: '1mb' })`는 multipart에 적용되지 않음. 인증된 사용자가 수백 MB 파일을 동시 업로드하면 Railway 컨테이너 OOM 가능.
- **수정:**
  ```typescript
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }),
  )
  ```
  multer 레벨 제한은 스트리밍 단계에서 초과 즉시 차단함. 서비스의 크기 검사는 이중 방어로 유지.

### C-2. 마지막 admin을 강등/삭제 가능 → 관리 기능 영구 잠금 ✅검증

- **위치:** `src/members/members.service.ts:34-64`
- **문제:** `updateRole`/`deleteMember`는 자기 자신 변경만 차단. 마지막 admin을 다른 admin이(또는 admin 둘이 서로 교차로) member로 강등하면 admin이 0명이 되어 모든 `/admin` 기능이 영구히 잠김.
- **수정:** admin을 강등/삭제하기 전에 잔여 admin 수 확인:
  ```typescript
  if (role !== 'admin' && profile.role === 'admin') {
    const adminCount = await this.prisma.profiles.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      throw new BadRequestException('마지막 관리자는 강등하거나 삭제할 수 없습니다.');
    }
  }
  ```

### C-3. CORS 폴백이 전체 오리진 허용 ✅검증

- **위치:** `src/main.ts:20`
- **문제:** `app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true })` — `CORS_ORIGIN` 누락 시 `origin: true`로 폴백해 요청의 Origin을 그대로 반사(전체 허용). Railway에서 env가 빠진 채 배포되면 CORS 보호가 사라짐.
- **수정:** 미설정 시 부팅 실패하도록 변경. 같은 위치에서 `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 필수 env 검증도 추가 (현재는 첫 요청에서야 오류가 드러남 — `jwt.verifier.ts:10`의 `new URL()`, `supabase-admin.service.ts`).
  ```typescript
  const missing = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGIN']
    .filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`필수 환경 변수가 없습니다: ${missing.join(', ')}`);
  app.enableCors({ origin: process.env.CORS_ORIGIN!.split(',') });
  ```
  (`REDIS_URL`은 선택 — 없으면 캐시 없이 동작하는 현 설계 유지)

### C-4. 잘못된 날짜 쿼리가 500으로 터짐 ✅검증

- **위치:** `src/events/events.service.ts:14-17`, `src/events/events.controller.ts:25`
- **문제:** `GET /events?from=abc` → `new Date('abc')` = Invalid Date가 그대로 Prisma에 전달되어 500 발생. 인증 없는 공개 엔드포인트라 누구나 트리거 가능.
- **수정:** 쿼리 DTO로 검증:
  ```typescript
  export class QueryEventsDto {
    @IsOptional() @IsISO8601() from?: string;
    @IsOptional() @IsISO8601() to?: string;
  }
  // controller: list(@Query() query: QueryEventsDto)
  ```

### C-5. Prisma graceful shutdown 없음 + 연결 풀 상한 미설정 ✅검증

- **위치:** `src/prisma/prisma.service.ts`, `src/main.ts`
- **문제:**
  1. `OnModuleDestroy` 미구현 + `main.ts`에 `app.enableShutdownHooks()` 없음 → 재배포 SIGTERM 시 DB 연결 미정리. Supabase 세션 풀러(연결 한도 공유) 환경에서 잦은 재배포 시 연결 고갈 위험.
  2. `PrismaPg` 풀 크기가 pg 기본값(10) — 인스턴스당 상한 명시 권장.
- **수정:**
  ```typescript
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 5),
  });
  // ...
  async onModuleDestroy() { await this.$disconnect(); }
  ```
  `main.ts`에 `app.enableShutdownHooks();` 추가 (없으면 destroy 훅이 호출되지 않음).

---

## 🟠 High — 다음 배포 전 수정 권장

### H-1. 공지(notice) 승격 권한 우회 ✅검증

- **위치:** `src/posts/posts.service.ts:114` (`update`)
- **문제:** `create()`는 `category === 'notice'`를 admin만 허용하지만 `update()`엔 이 검사가 없음 → 일반 부원이 자기 blog 글을 `PATCH /posts/:id { "category": "notice" }`로 공지로 승격 가능.
- **수정:** `update()`에도 동일 검사 추가:
  ```typescript
  if (dto.category === 'notice' && !(await this.isAdmin(userId))) {
    throw new ForbiddenException('공지는 운영진만 작성할 수 있습니다.');
  }
  ```

### H-2. 캐시 키 오염 + 영구 stale 캐시 ✅검증

- **위치:** `src/posts/posts.service.ts:48`, `src/activities/activities.service.ts:22`
- **문제:** 캐시 키가 raw 쿼리 파라미터로 생성됨(`posts:public:${category}`, `activities:${type}`). 무효화는 고정 키 목록(`PUBLIC_CACHE_KEYS`, `ACTIVITY_CACHE_KEYS`)만 수행 →
  - `?type=aaa`, `?type=bbb` 등 임의 값으로 Redis에 키가 무한 생성
  - 고정 목록 밖의 키는 쓰기 시 무효화되지 않아 TTL까지 영구 stale
- **수정:** 허용 값 화이트리스트 밖이면 캐시를 아예 사용하지 않음:
  ```typescript
  const CACHEABLE = new Set(['project', 'study', 'event']); // posts는 ['notice','blog']
  const cacheable = !type || CACHEABLE.has(type);
  if (cacheable) { /* 캐시 조회/저장 */ }
  ```
  또는 컨트롤러에 `@IsIn([...])` 쿼리 DTO 적용.

### H-3. 이벤트 날짜 역전 검사 누락

- **위치:** `src/events/events.service.ts:49`
- **문제:** 역전 검사가 `dto.endsAt && dto.startsAt` 둘 다 있을 때만 동작. `endsAt`만 PATCH하면 기존 `starts_at`보다 이전인 종료시각 저장 가능.
- **수정:** 기존 레코드 값과 병합해 최종 시각으로 비교:
  ```typescript
  const existing = await this.getOne(id);
  const finalStartsAt = dto.startsAt ? new Date(dto.startsAt) : existing.starts_at;
  const finalEndsAt = dto.endsAt ? new Date(dto.endsAt) : existing.ends_at;
  if (finalEndsAt && finalEndsAt < finalStartsAt) throw new BadRequestException(...);
  ```

### H-4. Prisma P2025가 500으로 누출

- **위치:** `posts.service.ts` update/remove, `members.service.ts` updateRole, `applications.service.ts` updateStatus
- **문제:** "존재 확인 → update/delete" 패턴에서 두 쿼리 사이에 레코드가 동시 삭제되면 `P2025`(Record not found)가 처리되지 않아 500 응답.
- **수정:** P2025를 `NotFoundException`으로 변환:
  ```typescript
  catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new NotFoundException('...를 찾을 수 없습니다.');
    }
    throw e;
  }
  ```

### H-5. 공개 지원서 엔드포인트 무방비

- **위치:** `src/applications/applications.controller.ts:9`, `src/applications/dto/create-application.dto.ts`
- **문제:**
  1. `POST /applications`는 인증 없는 공개 엔드포인트인데 rate limit 전무 (`@nestjs/throttler` 미설치) → 모집 기간 중 스팸 삽입으로 테이블/커넥션 풀 포화 가능
  2. DTO에 `MaxLength` 없음 — `name`/`contact` 무제한, `answers`는 `@IsObject()`만 있어 키/값 개수·크기·타입 무검증 (1MB JSON까지 DB에 그대로 저장됨)
- **수정:**
  - `@nestjs/throttler` 도입: 전역 기본 + 지원서 제출엔 엄격한 제한(예: IP당 1분 5회)
  - `name @MaxLength(100)`, `contact @MaxLength(50)`, `answers`는 커스텀 validator로 값 전부 string·키 ≤ 30개·값 ≤ 2000자 검증

### H-6. 헬스체크가 항상 200 — Railway 자동 복구 불능

- **위치:** `src/health/health.controller.ts`, `railway.json`
- **문제:** `/health`가 무조건 `{ status: 'ok' }` 반환 → DB가 죽어도 Railway가 정상으로 판단해 재시작하지 않음.
- **수정:** `PrismaService` 주입 후 `await this.prisma.$queryRaw\`SELECT 1\`;` 추가 (Redis는 선택 의존성이므로 제외). `railway.json`에 `healthcheckTimeout: 30`, `restartPolicyMaxRetries: 5` 명시.

### H-7. 설정값 캐시 스탬피드

- **위치:** `src/settings/settings.service.ts:27-38`
- **문제:** `getValue()`가 null 값을 캐시하지 않음 → DB에 설정 키가 없는 동안(초기 배포 등) 공개 엔드포인트 `/settings/recruit`가 매 요청 DB 조회. `ProfileCacheService`(`profile-cache.service.ts:5`)의 `NULL_SENTINEL` 패턴이 여기엔 미적용.
- **수정:** 동일한 sentinel 패턴으로 null도 짧은 TTL(60초)로 캐시.

---

## 🟡 Medium — 최적화 / 개선

| # | 위치 | 내용 | 수정 |
|---|---|---|---|
| M-1 | `members.service.ts:20` | `include: { users: true }`가 auth.users 전체 컬럼(암호 해시 포함) 로드, 실제 사용은 email뿐 | `users: { select: { email: true } }` |
| M-2 | `comments.service.ts:21,54` | 접근 확인용 `postsService.getOne()`이 게시글 content 전체 로드 + `create()`에서 role 이중 조회 | `select: { visibility: true }`만 읽는 경량 `assertVisible()` 분리 |
| M-3 | `posts/applications/members` list | 페이지네이션 없는 무제한 `findMany` — 데이터 누적 시 응답 비대화 | `take`/`skip` 추가 (limit 상한 100, 프론트 호환 위해 파라미터 없으면 기존 동작 유지 가능) |
| M-4 | `prisma/schema.prisma:545` | `posts`에 `(visibility, created_at DESC)` 인덱스 없음 — 가장 흔한 공개 목록 조회가 풀스캔 | `@@index([visibility, created_at(sort: Desc)])` + Supabase에 SQL 적용 |
| M-5 | `prisma/schema.prisma:551` | `profiles`에 `(generation, name)` 정렬 인덱스 없음 | `@@index([generation, name])` |
| M-6 | `main.ts:8`, `cache.service.ts:37` | BigInt→Number 직렬화 — 2^53 초과 시 정밀도 손실 (동아리 규모에선 현실적 위험 낮음) | `String` 직렬화 권장. **단, 프론트가 ID를 number로 파싱 중이면 호환성 확인 필수** |
| M-7 | `prisma.config.ts:2` | `dotenv`가 직접 의존성이 아닌 전이 의존성(prisma→@prisma/config→c12→dotenv) — prisma 업데이트 시 깨질 수 있음 | `npm i -D dotenv` |
| M-8 | `members.service.ts:50` | DB 업데이트 후 캐시 삭제 — 그 사이 이전 역할이 재캐싱되면 TTL 60초간 stale | 업데이트 전+후 invalidate 또는 TTL 단축 |
| M-9 | `uploads.service.ts:32` | Supabase 스토리지 오류를 로깅 없이 일반 메시지로 래핑 — 운영 중 진단 불가 | `Logger.error`로 `error.message` 기록 |
| M-10 | `railway.json` | `healthcheckTimeout`, `restartPolicyMaxRetries` 미설정 | H-6과 함께 명시 |
| M-11 | `settings.service.ts:74` | `getAbout()` 캐시 미스 시 3회 SELECT | `findMany({ where: { key: { in: [...] } } })` 1회로 통합 (H-7 적용 시 빈도 낮아 우선순위 낮음) |

---

## 🟢 Low — 선택적

- **`signup.service.ts:8`** — `safeCompare`의 길이 분기(`a.length !== b.length` 즉시 반환)로 초대 코드 길이가 타이밍으로 노출. 고정 길이 패딩 후 `timingSafeEqual` 권장
- **`settings.service.ts:65`** — 초대 코드가 DB·Redis에 평문 저장. bcrypt/scrypt 해시 저장 고려
- **`cache.service.ts:15`** — Redis `retryStrategy`가 null을 반환하지 않아 영구 다운 시 무한 재연결 (일정 횟수 후 `return null`)
- **`main.ts:17`** — `ValidationPipe`에 `forbidNonWhitelisted` 없음 (추가 시 프론트가 여분 필드를 보내고 있다면 400 발생하므로 주의)
- **`create-activity.dto.ts:23`** — `year`에 `@Min(2000)`만 있고 `@Max` 없음 (`@Max(2100)` 권장)
- **스토리지 고아 파일** — 회원/게시글/활동 삭제 시 Supabase Storage의 이미지가 정리되지 않고 영구 잔류 (저장 비용 + 개인정보). 업로더 추적 테이블 도입 등 별도 과제
- **`admin.controller.spec.ts`** — `updateMemberRole`/`deleteMember` 엔드포인트 테스트 커버리지 없음

---

## 잘 되어 있는 부분

- JWKS 기반 JWT 검증을 `??=`로 싱글턴 캐싱 (`jwt.verifier.ts`)
- `CacheService`가 Redis 장애 시 예외를 삼키고 DB 폴백 — Redis 다운이 서비스 장애로 전파되지 않음
- `ProfileCacheService`의 NULL_SENTINEL 패턴 (비회원 토큰의 반복 DB 조회 방지)
- 업로드 확장자를 사용자 파일명이 아닌 검증된 mimetype에서 결정 (spoofing 방지)
- 가입 시 profiles 생성 실패하면 auth 유저 보상 삭제 (`signup.service.ts:48-54`)
- `main.ts`의 `json({ limit: '1mb' })` 본문 크기 제한
- 게시글 member 가시성의 권한 경계를 "유효한 토큰"이 아닌 "profiles 행 존재"로 정의

---

## 권장 수정 순서

1. **Critical 5건** (C-1 ~ C-5) — 즉시
2. **High 7건** (H-1 ~ H-7) — 다음 배포 전
3. **Medium** — 순차적으로 (M-6 BigInt는 프론트 영향 확인 후)
4. **Low** — 여유 있을 때

## 수정 후 검증 방법

1. `npm run build` + `npm test` 통과 확인
2. 로컬 수동 확인:
   - 6MB 파일 업로드 → 메모리 적재 없이 즉시 413/400
   - `GET /events?from=abc` → 400 (500 아님)
   - 일반 부원 토큰으로 `PATCH /posts/:id {"category":"notice"}` → 403
   - 마지막 admin 강등 시도 → 400
   - `GET /activities?type=zzz` 후 `redis-cli keys 'activities:*'` → 키 미생성 확인
   - `/health` — DB 정상 시 200, DATABASE_URL 오류 상태에서 5xx
3. Railway 배포 후 빌드 성공 및 헬스체크 통과 확인

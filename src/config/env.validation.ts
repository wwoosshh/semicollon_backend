// 누락된 env가 첫 요청에서야 드러나지 않도록 부팅 시점에 검증한다.
// REDIS_URL은 선택 — 없으면 캐시 없이 동작하는 설계라 제외.
const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CORS_ORIGIN',
] as const;

export function assertRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`필수 환경 변수가 없습니다: ${missing.join(', ')}`);
  }
}

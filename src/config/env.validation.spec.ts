import { assertRequiredEnv } from './env.validation';

const fullEnv = {
  DATABASE_URL: 'postgresql://localhost/db',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'key',
  CORS_ORIGIN: 'http://localhost:3000',
};

describe('assertRequiredEnv', () => {
  it('passes when all required vars are present', () => {
    expect(() => assertRequiredEnv(fullEnv)).not.toThrow();
  });

  it('throws when a required var is missing', () => {
    const withoutCors: Record<string, string | undefined> = { ...fullEnv };
    delete withoutCors.CORS_ORIGIN;
    expect(() => assertRequiredEnv(withoutCors)).toThrow(/CORS_ORIGIN/);
  });

  it('lists every missing var in the error message', () => {
    expect(() => assertRequiredEnv({})).toThrow(
      /DATABASE_URL.*SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY.*CORS_ORIGIN/,
    );
  });

  it('treats an empty string as missing', () => {
    expect(() => assertRequiredEnv({ ...fullEnv, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL/,
    );
  });
});

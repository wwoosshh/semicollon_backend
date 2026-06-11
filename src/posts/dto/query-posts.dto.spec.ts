import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryPostsDto } from './query-posts.dto';

async function validateQuery(input: Record<string, unknown>) {
  return validate(
    plainToInstance(QueryPostsDto, input, { enableImplicitConversion: true }),
  );
}

describe('QueryPostsDto', () => {
  it('accepts empty query', async () => {
    expect(await validateQuery({})).toHaveLength(0);
  });

  it('accepts known categories', async () => {
    expect(await validateQuery({ category: 'notice' })).toHaveLength(0);
    expect(await validateQuery({ category: 'blog' })).toHaveLength(0);
  });

  it('rejects an unknown category', async () => {
    const errors = await validateQuery({ category: 'zzz' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a numeric limit within range', async () => {
    expect(await validateQuery({ limit: '4' })).toHaveLength(0);
  });

  it('rejects a limit over 100', async () => {
    const errors = await validateQuery({ limit: '101' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-numeric limit', async () => {
    const errors = await validateQuery({ limit: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
  });
});

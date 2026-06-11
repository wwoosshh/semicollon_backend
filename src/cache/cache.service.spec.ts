import { CacheService } from './cache.service';

const mockRedis = () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
});

describe('CacheService', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.REDIS_URL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalEnv;
    }
  });

  it('returns null from get and no-ops set/del when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;
    const svc = new CacheService();
    const result = await svc.get('some-key');
    expect(result).toBeNull();
    await expect(svc.set('some-key', { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(svc.del('some-key')).resolves.toBeUndefined();
  });

  it('parses stored JSON and returns the value on get (mock client injected)', async () => {
    const svc = new CacheService();
    const redis = mockRedis();
    redis.get.mockResolvedValue(JSON.stringify({ name: 'test' }));
    (svc as any).client = redis;

    const result = await svc.get<{ name: string }>('some-key');
    expect(result).toEqual({ name: 'test' });
    expect(redis.get).toHaveBeenCalledWith('some-key');
  });

  it('returns null when client.get throws (fault isolation)', async () => {
    const svc = new CacheService();
    const redis = mockRedis();
    redis.get.mockRejectedValue(new Error('Connection refused'));
    (svc as any).client = redis;

    const result = await svc.get('some-key');
    expect(result).toBeNull();
  });

  it('del passes multiple keys to client.del', async () => {
    const svc = new CacheService();
    const redis = mockRedis();
    (svc as any).client = redis;

    await svc.del('key1', 'key2', 'key3');
    expect(redis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
  });
});

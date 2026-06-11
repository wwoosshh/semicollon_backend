import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryEventsDto } from './query-events.dto';

describe('QueryEventsDto', () => {
  it('rejects a non-date from value', async () => {
    const dto = plainToInstance(QueryEventsDto, { from: 'abc' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-date to value', async () => {
    const dto = plainToInstance(QueryEventsDto, { to: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid ISO8601 from/to', async () => {
    const dto = plainToInstance(QueryEventsDto, {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts missing from/to', async () => {
    const dto = plainToInstance(QueryEventsDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

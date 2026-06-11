import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateActivityDto } from './create-activity.dto';

const valid = {
  title: '프로젝트',
  description: '설명',
  type: 'project',
  year: 2026,
};

describe('CreateActivityDto', () => {
  it('accepts a valid activity', async () => {
    const errors = await validate(plainToInstance(CreateActivityDto, valid));
    expect(errors).toHaveLength(0);
  });

  it('rejects a year above 2100', async () => {
    const errors = await validate(
      plainToInstance(CreateActivityDto, { ...valid, year: 99999 }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});

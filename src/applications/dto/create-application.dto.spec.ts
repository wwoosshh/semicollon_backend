import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApplicationDto } from './create-application.dto';

async function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateApplicationDto, input));
}

const validInput = {
  name: '지원자',
  contact: '010-0000-0000',
  answers: { q1: '지원 동기입니다.' },
};

describe('CreateApplicationDto', () => {
  it('accepts a valid application', async () => {
    const errors = await validateDto(validInput);
    expect(errors).toHaveLength(0);
  });

  it('rejects a name longer than 100 characters', async () => {
    const errors = await validateDto({ ...validInput, name: 'a'.repeat(101) });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a contact longer than 50 characters', async () => {
    const errors = await validateDto({
      ...validInput,
      contact: '0'.repeat(51),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects answers with a non-string value', async () => {
    const errors = await validateDto({
      ...validInput,
      answers: { q1: { nested: 'object' } },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects answers with more than 30 keys', async () => {
    const answers: Record<string, string> = {};
    for (let i = 0; i < 31; i++) answers[`q${i}`] = 'a';
    const errors = await validateDto({ ...validInput, answers });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an answer value longer than 2000 characters', async () => {
    const errors = await validateDto({
      ...validInput,
      answers: { q1: 'a'.repeat(2001) },
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

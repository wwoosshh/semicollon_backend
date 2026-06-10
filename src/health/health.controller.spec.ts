import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('GET /health returns ok', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = module.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});

import { JwtVerifier } from './jwt.verifier';

describe('JwtVerifier', () => {
  it('rejects a malformed token', async () => {
    const verifier = new JwtVerifier();
    await expect(verifier.verify('not-a-jwt')).rejects.toThrow();
  });
});

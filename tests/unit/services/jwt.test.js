import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, signTokens, refreshAccessToken } from '../../../src/services/jwt.js';

describe('JWT Service', () => {
  const payload = { id: 1, username: 'test', name: 'Test', role: 'student' };

  it('should sign and verify a token', () => {
    const token = signToken(payload);
    expect(token).toBeTruthy();

    const decoded = verifyToken(token);
    expect(decoded).toMatchObject({ id: 1, username: 'test', role: 'student' });
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid-token');
    expect(decoded).toBeNull();
  });

  it('should sign access and refresh tokens', () => {
    const tokens = signTokens(payload);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });
});

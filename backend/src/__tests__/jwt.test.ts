// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Tests unitarios de helpers JWT
import {
  generateAccessToken, generateRefreshToken,
  verifyAccessToken,   verifyRefreshToken,
} from '../utils/jwt';

// Parcheamos env para que no dependa de .env real
jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET:             'test-jwt-secret-32-chars-minimum!!',
    JWT_REFRESH_SECRET:     'test-refresh-secret-32-chars-min!',
    JWT_EXPIRES_IN:         '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('JWT utils', () => {
  const payload = { userId: 'abc-123', role: 'passenger' as const, email: 'test@vride.com' };

  describe('generateAccessToken / verifyAccessToken', () => {
    it('genera y verifica un access token válido', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.email).toBe(payload.email);
    });

    it('rechaza un token con firma alterada', () => {
      const token = generateAccessToken(payload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('rechaza un token con issuer incorrecto', () => {
      const jwt = require('jsonwebtoken');
      const bad = jwt.sign(payload, 'test-jwt-secret-32-chars-minimum!!', {
        expiresIn: '1h',
        issuer: 'malicious-issuer',
        audience: 'vride-app',
      });
      expect(() => verifyAccessToken(bad)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    const refreshPayload = { userId: 'abc-123', tokenVersion: 1 };

    it('genera y verifica un refresh token válido', () => {
      const token = generateRefreshToken(refreshPayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(refreshPayload.userId);
      expect(decoded.tokenVersion).toBe(1);
    });

    it('no es verificable con la clave de access token', () => {
      const token = generateRefreshToken(refreshPayload);
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('roles permitidos en access token', () => {
    it.each([['passenger'], ['driver'], ['admin']] as const)(
      'acepta rol %s',
      (role) => {
        const token = generateAccessToken({ ...payload, role });
        const decoded = verifyAccessToken(token);
        expect(decoded.role).toBe(role);
      }
    );
  });
});

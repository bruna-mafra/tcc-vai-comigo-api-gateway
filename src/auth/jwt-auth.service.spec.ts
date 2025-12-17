import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthService } from './jwt-auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let configService: ConfigService;

  const JWT_SECRET = 'test-secret-key';
  const JWT_ISSUER = 'vai-comigo';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET,
                JWT_ISSUER,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateToken', () => {
    it('should validate a correct token', () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'USER' },
        JWT_SECRET,
        { issuer: JWT_ISSUER },
      );

      const result = service.validateToken(token);
      expect(result.userId).toBe('user-123');
      expect(result.role).toBe('USER');
    });

    it('should throw for invalid token', () => {
      const invalidToken = 'invalid-token';
      expect(() => service.validateToken(invalidToken)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for missing userId or role', () => {
      const token = jwt.sign({ userId: 'user-123' }, JWT_SECRET, {
        issuer: JWT_ISSUER,
      });

      expect(() => service.validateToken(token)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const result = service.extractTokenFromHeader(header);
      expect(result).toBe(token);
    });

    it('should throw for missing header', () => {
      expect(() => service.extractTokenFromHeader('')).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for invalid format', () => {
      expect(() =>
        service.extractTokenFromHeader('InvalidFormat token'),
      ).toThrow(UnauthorizedException);
    });
  });
});

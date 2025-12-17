import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard } from './jwt.guard';
import { JwtAuthService } from './jwt-auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-sinon';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let jwtAuthService: JwtAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        {
          provide: JwtAuthService,
          useValue: {
            extractTokenFromHeader: jest.fn(),
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
  });

  it('should allow access with valid token', () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jest
      .spyOn(jwtAuthService, 'extractTokenFromHeader')
      .mockReturnValue('valid-token');
    jest
      .spyOn(jwtAuthService, 'validateToken')
      .mockReturnValue({ userId: 'user-123', role: 'USER' });

    const mockContext = createMock<ExecutionContext>({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    });

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRequest['userContext']).toEqual({
      userId: 'user-123',
      role: 'USER',
    });
  });

  it('should deny access without token', () => {
    const mockRequest = {
      headers: {},
    };

    jest
      .spyOn(jwtAuthService, 'extractTokenFromHeader')
      .mockImplementation(() => {
        throw new UnauthorizedException('Missing Authorization header');
      });

    const mockContext = createMock<ExecutionContext>({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    });

    expect(() => guard.canActivate(mockContext)).toThrow(
      UnauthorizedException,
    );
  });
});

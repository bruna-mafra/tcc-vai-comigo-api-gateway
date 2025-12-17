import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';
import { HttpClientService } from '@/gateway/http-client.service';
import { GatewayConfigService } from '@/config/gateway-config.service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let httpClientService: HttpClientService;

  const mockServiceUrl = {
    users: 'http://user-service:3001',
    rides: 'http://ride-service:3002',
    chat: 'http://chat-service:3003',
    maps: 'http://maps-service:3004',
    reviews: 'http://review-service:3005',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: HttpClientService,
          useValue: {
            forwardRequest: jest.fn(),
          },
        },
        {
          provide: GatewayConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({
              services: mockServiceUrl,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    httpClientService = module.get<HttpClientService>(HttpClientService);
  });

  describe('checkHealth', () => {
    it('should return UP when all services are healthy', async () => {
      jest
        .spyOn(httpClientService, 'forwardRequest')
        .mockResolvedValue({ status: 200 } as any);

      const result = await service.checkHealth();

      expect(result.status).toBe('UP');
      expect(result.services.users).toBe('UP');
      expect(result.services.rides).toBe('UP');
      expect(result.services.chat).toBe('UP');
      expect(result.services.maps).toBe('UP');
      expect(result.services.reviews).toBe('UP');
    });

    it('should return DOWN when any service is unhealthy', async () => {
      jest
        .spyOn(httpClientService, 'forwardRequest')
        .mockImplementation((request) => {
          if (request.baseUrl === mockServiceUrl.rides) {
            return Promise.reject(new Error('Service unavailable'));
          }
          return Promise.resolve({ status: 200 } as any);
        });

      const result = await service.checkHealth();

      expect(result.status).toBe('DOWN');
      expect(result.services.rides).toBe('DOWN');
      expect(result.services.users).toBe('UP');
    });

    it('should include timestamp', async () => {
      jest
        .spyOn(httpClientService, 'forwardRequest')
        .mockResolvedValue({ status: 200 } as any);

      const result = await service.checkHealth();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpClientService } from './http-client.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('HttpClientService', () => {
  let service: HttpClientService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('forwardRequest', () => {
    it('should forward a GET request correctly', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: { message: 'success' },
        headers: {},
        statusText: 'OK',
        config: {} as any,
      };

      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest({
        method: 'GET',
        path: '/test',
        headers: {},
        baseUrl: 'http://service:3000',
        correlationId: 'test-123',
      });

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ message: 'success' });
    });

    it('should add correlation ID header', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: {},
        headers: {},
        statusText: 'OK',
        config: {} as any,
      };

      let capturedConfig: any;
      jest
        .spyOn(httpService, 'request')
        .mockImplementation((config) => {
          capturedConfig = config;
          return of(mockResponse) as any;
        });

      await service.forwardRequest({
        method: 'GET',
        path: '/test',
        headers: {},
        baseUrl: 'http://service:3000',
        correlationId: 'test-123',
      });

      expect(capturedConfig.headers['x-correlation-id']).toBe('test-123');
    });

    it('should forward POST request with body', async () => {
      const mockResponse: AxiosResponse = {
        status: 201,
        data: { id: '123' },
        headers: {},
        statusText: 'Created',
        config: {} as any,
      };

      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest({
        method: 'POST',
        path: '/users',
        headers: { 'content-type': 'application/json' },
        body: { name: 'John' },
        baseUrl: 'http://user-service:3001',
        correlationId: 'test-456',
      });

      expect(result.status).toBe(201);
      expect(result.data.id).toBe('123');
    });
  });
});

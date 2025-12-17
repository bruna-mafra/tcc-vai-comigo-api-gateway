import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Gateway E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health should return status UP', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('services');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Swagger Docs', () => {
    it('GET /api/docs should return Swagger UI', () => {
      return request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);
    });

    it('GET /api/docs/json should return OpenAPI spec', () => {
      return request(app.getHttpServer())
        .get('/api/docs/json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body).toHaveProperty('paths');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Make requests until rate limit is hit
      // Note: This depends on the specific rate limit configuration
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(request(app.getHttpServer()).get('/health'));
      }

      const results = await Promise.all(requests);
      const hasRateLimitError = results.some((res) => res.status === 429);

      expect(hasRateLimitError).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for unknown routes', () => {
      return request(app.getHttpServer())
        .get('/api/unknown/path')
        .expect(400);
    });

    it('should return standardized error response', () => {
      return request(app.getHttpServer())
        .get('/api/unknown/path')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('correlationId');
        });
    });
  });

  describe('Correlation ID', () => {
    it('should generate correlation ID if not provided', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-correlation-id']).toBeDefined();
        });
    });

    it('should preserve provided correlation ID', () => {
      const correlationId = 'test-123-456';
      return request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', correlationId)
        .expect((res) => {
          expect(res.headers['x-correlation-id']).toBe(correlationId);
        });
    });
  });
});

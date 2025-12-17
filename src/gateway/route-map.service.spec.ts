import { RouteMapService } from './route-map.service';
import { ServiceUrl } from '@/types';

describe('RouteMapService', () => {
  const mockServiceUrl: ServiceUrl = {
    users: 'http://user-service:3001',
    rides: 'http://ride-service:3002',
    chat: 'http://chat-service:3003',
    maps: 'http://maps-service:3004',
    reviews: 'http://review-service:3005',
  };

  describe('getRouteMapping', () => {
    it('should map /api/users/register to users service (public)', () => {
      const mapping = RouteMapService.getRouteMapping(
        '/api/users/register',
        mockServiceUrl,
      );

      expect(mapping).toBeDefined();
      expect(mapping?.prefix).toBe('/api/users/register');
      expect(mapping?.public).toBe(true);
    });

    it('should map /api/rides to rides service (authenticated)', () => {
      const mapping = RouteMapService.getRouteMapping(
        '/api/rides/123',
        mockServiceUrl,
      );

      expect(mapping).toBeDefined();
      expect(mapping?.prefix).toBe('/api/rides');
      expect(mapping?.public).toBeFalsy();
    });

    it('should return null for unknown routes', () => {
      const mapping = RouteMapService.getRouteMapping(
        '/api/unknown',
        mockServiceUrl,
      );

      expect(mapping).toBeNull();
    });

    it('should prioritize more specific routes', () => {
      const mapping = RouteMapService.getRouteMapping(
        '/api/users/register',
        mockServiceUrl,
      );

      // Should match /api/users/register (more specific) not /api/users
      expect(mapping?.prefix).toBe('/api/users/register');
    });
  });

  describe('isPublicRoute', () => {
    it('should return true for public routes', () => {
      expect(
        RouteMapService.isPublicRoute(
          '/api/users/register',
          mockServiceUrl,
        ),
      ).toBe(true);
      expect(
        RouteMapService.isPublicRoute('/api/users/login', mockServiceUrl),
      ).toBe(true);
    });

    it('should return false for authenticated routes', () => {
      expect(
        RouteMapService.isPublicRoute('/api/rides/123', mockServiceUrl),
      ).toBe(false);
      expect(
        RouteMapService.isPublicRoute('/api/chat/456', mockServiceUrl),
      ).toBe(false);
    });
  });

  describe('getRequiredRoles', () => {
    it('should return admin role for admin routes', () => {
      const roles = RouteMapService.getRequiredRoles(
        '/api/admin/users',
        mockServiceUrl,
      );

      expect(roles).toContain('ADMIN');
    });

    it('should return null for routes without role restrictions', () => {
      const roles = RouteMapService.getRequiredRoles(
        '/api/rides/123',
        mockServiceUrl,
      );

      expect(roles).toBeNull();
    });
  });
});

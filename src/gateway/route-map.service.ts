import { ServiceUrl } from '@/types';

export interface RouteMapping {
  prefix: string;
  serviceUrl: string;
  public?: boolean;
  roles?: string[];
}

export class RouteMapService {
  static getRouteMappings(services: ServiceUrl): RouteMapping[] {
    return [
      // Public routes
      {
        prefix: '/api/users/register',
        serviceUrl: services.users,
        public: true,
      },
      {
        prefix: '/api/users/login',
        serviceUrl: services.users,
        public: true,
      },
      {
        prefix: '/api/users/verify-email',
        serviceUrl: services.users,
        public: true,
      },

      // Authenticated user routes
      {
        prefix: '/api/users',
        serviceUrl: services.users,
        public: false,
      },

      // Authenticated ride routes
      {
        prefix: '/api/rides',
        serviceUrl: services.rides,
        public: false,
      },

      // Authenticated chat routes
      {
        prefix: '/api/chat',
        serviceUrl: services.chat,
        public: false,
      },

      // Authenticated maps routes
      {
        prefix: '/api/maps',
        serviceUrl: services.maps,
        public: false,
      },

      // Authenticated review routes
      {
        prefix: '/api/reviews',
        serviceUrl: services.reviews,
        public: false,
      },

      // Admin routes
      {
        prefix: '/api/admin',
        serviceUrl: services.users,
        public: false,
        roles: ['ADMIN'],
      },
    ];
  }

  static getRouteMapping(
    requestPath: string,
    services: ServiceUrl,
  ): RouteMapping | null {
    const mappings = this.getRouteMappings(services);

    // Find the most specific matching route
    return (
      mappings
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find((mapping) => requestPath.startsWith(mapping.prefix)) || null
    );
  }

  static isPublicRoute(
    requestPath: string,
    services: ServiceUrl,
  ): boolean {
    const mapping = this.getRouteMapping(requestPath, services);
    return mapping?.public ?? false;
  }

  static getRequiredRoles(
    requestPath: string,
    services: ServiceUrl,
  ): string[] | null {
    const mapping = this.getRouteMapping(requestPath, services);
    return mapping?.roles ?? null;
  }
}

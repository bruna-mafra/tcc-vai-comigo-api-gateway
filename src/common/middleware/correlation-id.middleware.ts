import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Log request
    this.logger.debug(
      `[${correlationId}] ${req.method} ${req.path} from ${req.ip}`,
    );

    // Log response when it's finished
    const originalSend = res.send;
    res.send = function (...args: any[]) {
      this.logger.debug(
        `[${correlationId}] Response: ${res.statusCode}`,
      );
      return originalSend.apply(res, args);
    };

    next();
  }
}

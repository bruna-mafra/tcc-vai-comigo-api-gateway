import {
  Controller,
  All,
  Req,
  Res,
  Logger,
  UseInterceptors,
  Middleware,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('api')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private gatewayService: GatewayService) {}

  @All('*')
  async handleAllRequests(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();
    const startTime = Date.now();

    try {
      const result = await this.gatewayService.handleRequest(
        req,
        correlationId,
      );

      const duration = Date.now() - startTime;
      this.logger.debug(
        `${req.method} ${req.path} - ${result.statusCode} - ${duration}ms (correlationId: ${correlationId})`,
      );

      res
        .status(result.statusCode)
        .set({
          'x-correlation-id': correlationId,
          ...result.headers,
        })
        .json(result.data);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `${req.method} ${req.path} - Error - ${duration}ms (correlationId: ${correlationId}): ${error.message}`,
      );

      // Error handling is done by exception filters
      throw error;
    }
  }
}

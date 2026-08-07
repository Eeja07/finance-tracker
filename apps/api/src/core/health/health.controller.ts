import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, string>;
}

@ApiTags('Observability')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Overall health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check(): Promise<HealthCheckResponse> {
    let dbCheck = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbCheck = 'up';
    } catch {
      dbCheck = 'down';
    }

    return {
      status: dbCheck === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: dbCheck,
      },
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe check' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  liveness(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe check including database connection',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to handle traffic',
  })
  @ApiResponse({ status: 503, description: 'Service or database unavailable' })
  async readiness(): Promise<HealthCheckResponse> {
    let dbStatus = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    if (dbStatus === 'down') {
      throw new ServiceUnavailableException({
        status: 'down',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        checks: {
          database: dbStatus,
        },
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: dbStatus,
      },
    };
  }

  @Get('startup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Startup probe check' })
  @ApiResponse({
    status: 200,
    description: 'Application has started up successfully',
  })
  startup(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

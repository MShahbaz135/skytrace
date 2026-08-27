import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  health() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}

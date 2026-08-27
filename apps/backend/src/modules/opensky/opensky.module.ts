import { Module } from '@nestjs/common';
import { OpenSkyClient } from './opensky.client';
import { OpenSkyTokenService } from './opensky-token.service';

@Module({
  providers: [OpenSkyTokenService, OpenSkyClient],
  exports: [OpenSkyClient, OpenSkyTokenService],
})
export class OpenSkyModule {}

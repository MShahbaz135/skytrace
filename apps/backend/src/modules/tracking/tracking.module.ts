import { Module } from '@nestjs/common';
import { EnrichmentModule } from '../enrichment/enrichment.module';
import { OpenSkyModule } from '../opensky/opensky.module';
import { ReplaySource } from './replay.source';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  imports: [OpenSkyModule, EnrichmentModule],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway, ReplaySource],
  exports: [TrackingService],
})
export class TrackingModule {}

import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadConfig } from '../../config/configuration';
import { AdsbdbClient } from './adsbdb.client';
import { AircraftEntity } from './entities/aircraft.entity';
import { AirportEntity } from './entities/airport.entity';
import { FlightRouteEntity } from './entities/flight-route.entity';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentStore } from './enrichment.store';
import { MemoryEnrichmentStore } from './memory-enrichment.store';
import { TypeOrmEnrichmentStore } from './typeorm-enrichment.store';

const databaseEnabled = loadConfig().database.enabled;

const storeImports: DynamicModule[] = databaseEnabled
  ? [TypeOrmModule.forFeature([AircraftEntity, FlightRouteEntity, AirportEntity])]
  : [];

const storeProvider: Provider = {
  provide: EnrichmentStore,
  useClass: databaseEnabled ? TypeOrmEnrichmentStore : MemoryEnrichmentStore,
};

@Module({
  imports: storeImports,
  providers: [AdsbdbClient, EnrichmentService, storeProvider],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}

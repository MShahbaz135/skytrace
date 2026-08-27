import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { AircraftEnrichment, AircraftState } from '@skytrace/shared';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { TrackingService } from './tracking.service';

export interface AircraftDetailResponse {
  state: AircraftState;
  enrichment: AircraftEnrichment | null;
}

@Controller('aircraft')
export class TrackingController {
  constructor(
    private readonly tracking: TrackingService,
    private readonly enrichment: EnrichmentService,
  ) {}

  /**
   * Point lookup for a single aircraft, so a link to a flight page resolves without
   * opening a stream subscription. Only answers for aircraft currently in the feed —
   * nothing is retained once an aircraft lands or leaves every subscribed viewport.
   */
  @Get(':icao24')
  getAircraft(@Param('icao24') icao24: string): AircraftDetailResponse {
    const state = this.tracking.getState(icao24.trim().toLowerCase());
    if (!state) {
      throw new NotFoundException(
        'That aircraft is not currently being tracked. Open it from the live map.',
      );
    }

    const [enrichment] = this.enrichment.knownFor([state]);
    return { state, enrichment: enrichment ?? null };
  }
}

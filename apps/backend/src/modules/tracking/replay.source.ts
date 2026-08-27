import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { destinationPoint, type AircraftState } from '@skytrace/shared';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';

interface ReplayFixture {
  recordedAt: string;
  bbox: { south: number; west: number; north: number; east: number };
  states: AircraftState[];
}

/**
 * Serves a recorded slice of real traffic when the live feed cannot be reached.
 *
 * OpenSky credentials expire, daily credits run out, and the service occasionally blocks
 * cloud IP ranges. Any of those would leave a portfolio link showing an empty map, so the
 * server degrades to a recorded snapshot instead — clearly labelled as demo data by the
 * stream status, never presented as live.
 *
 * Aircraft are advanced along their recorded track rather than frozen, using the same
 * great-circle projection the client interpolator uses, so the map still moves.
 */
@Injectable()
export class ReplaySource implements OnModuleInit {
  private readonly logger = new Logger(ReplaySource.name);
  private fixture: ReplayFixture | null = null;
  private startedAtMs = Date.now();

  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  onModuleInit(): void {
    if (this.config.replay.mode === 'off') return;

    const path = resolve(process.cwd(), this.config.replay.fixturePath);
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as ReplayFixture;
      if (!Array.isArray(parsed.states) || parsed.states.length === 0) {
        throw new Error('fixture contains no states');
      }
      this.fixture = parsed;
      this.logger.log(
        `Replay fixture loaded: ${parsed.states.length} aircraft recorded ${parsed.recordedAt}`,
      );
    } catch (error) {
      this.logger.warn(
        `No usable replay fixture at ${path} (${error instanceof Error ? error.message : String(error)}). ` +
          'Run "npm run record:fixture" to create one.',
      );
    }
  }

  get available(): boolean {
    return this.fixture !== null;
  }

  /** True when replay should be used regardless of upstream health. */
  get forced(): boolean {
    return this.config.replay.mode === 'always' && this.available;
  }

  /** True when replay may stand in for a failed upstream poll. */
  get allowedAsFallback(): boolean {
    return this.config.replay.mode !== 'off' && this.available;
  }

  getStates(nowMs: number = Date.now()): AircraftState[] {
    if (!this.fixture) return [];

    const loopMs = this.config.replay.loopSeconds * 1000;
    const elapsedSec = (((nowMs - this.startedAtMs) % loopMs) + loopMs) % loopMs / 1000;
    const nowSeconds = Math.floor(nowMs / 1000);

    return this.fixture.states.map((state) => {
      const canMove =
        !state.onGround &&
        state.velocity !== null &&
        state.velocity > 0 &&
        state.trueTrack !== null;

      const position = canMove
        ? destinationPoint(
            { lat: state.lat, lng: state.lng },
            state.trueTrack as number,
            (state.velocity as number) * elapsedSec,
          )
        : { lat: state.lat, lng: state.lng };

      return {
        ...state,
        lat: position.lat,
        lng: position.lng,
        // Timestamps are rewritten to now so the client does not treat the fixture as
        // stale and refuse to interpolate it.
        lastContact: nowSeconds,
        timePosition: nowSeconds,
      };
    });
  }
}

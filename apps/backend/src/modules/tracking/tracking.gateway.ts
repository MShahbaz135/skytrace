import { Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import {
  ClientEvent,
  ServerEvent,
  SOCKET_NAMESPACE,
  bboxContains,
  normaliseBbox,
  type Bbox,
} from '@skytrace/shared';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { TrackingService } from './tracking.service';

/** Guards against malformed or hostile viewport payloads from the browser. */
function parseBbox(value: unknown): Bbox | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const coords = [candidate.south, candidate.west, candidate.north, candidate.east];
  if (!coords.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;

  return normaliseBbox({
    south: candidate.south as number,
    west: candidate.west as number,
    north: candidate.north as number,
    east: candidate.east as number,
  });
}

@WebSocketGateway({ namespace: SOCKET_NAMESPACE })
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TrackingGateway.name);
  private readonly viewports = new Map<string, Bbox>();
  private readonly subscriptions: Subscription[] = [];

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly tracking: TrackingService,
    private readonly enrichment: EnrichmentService,
  ) {}

  onModuleInit(): void {
    this.subscriptions.push(
      this.tracking.ticks$.subscribe((tick) => {
        // Reference data is resolved out of band; positions are never delayed by it.
        void this.enrichment.observe(tick.updated);

        // Each client only receives aircraft inside the viewport it asked for, so a user
        // watching one city does not pay for the bandwidth of a global feed.
        for (const [clientId, bbox] of this.viewports) {
          const updated = tick.updated.filter((state) =>
            bboxContains(bbox, state.lat, state.lng),
          );
          if (updated.length === 0 && tick.removed.length === 0) continue;

          this.server.to(clientId).emit(ServerEvent.Delta, {
            updated,
            removed: tick.removed,
            serverTime: tick.serverTime,
          });
        }
      }),
    );

    this.subscriptions.push(
      this.enrichment.enriched$.subscribe((items) => {
        for (const [clientId, bbox] of this.viewports) {
          const relevant = items.filter((item) => {
            const state = this.tracking.getState(item.icao24);
            return state !== null && bboxContains(bbox, state.lat, state.lng);
          });
          if (relevant.length === 0) continue;

          this.server.to(clientId).emit(ServerEvent.Enriched, { items: relevant });
        }
      }),
    );

    this.subscriptions.push(
      this.tracking.status$.subscribe((status) => {
        this.server?.emit(ServerEvent.Status, status);
      }),
    );
  }

  onModuleDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  handleConnection(client: Socket): void {
    client.emit(ServerEvent.Status, this.tracking.status$.value);
  }

  handleDisconnect(client: Socket): void {
    this.viewports.delete(client.id);
    this.tracking.removeViewport(client.id);
  }

  @SubscribeMessage(ClientEvent.SetViewport)
  onSetViewport(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): void {
    const payload = (body ?? {}) as Record<string, unknown>;
    const bbox = parseBbox(payload.bbox);

    if (!bbox) {
      this.logger.warn(`Client ${client.id} sent an invalid viewport, ignoring`);
      return;
    }

    this.viewports.set(client.id, bbox);
    this.tracking.setViewport(client.id, bbox);

    const aircraft = this.tracking.snapshot(bbox);
    client.emit(ServerEvent.Snapshot, { aircraft, serverTime: Date.now() });

    // Prime the newly visible area with whatever has already been resolved, so a client
    // joining mid-session does not wait for the queue to rediscover known aircraft.
    const known = this.enrichment.knownFor(aircraft);
    if (known.length > 0) client.emit(ServerEvent.Enriched, { items: known });

    void this.enrichment.observe(aircraft);
  }
}

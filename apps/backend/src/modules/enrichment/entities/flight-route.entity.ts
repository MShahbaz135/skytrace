import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * The route normally flown under a callsign, as published in schedules.
 *
 * Unlike airframe data this expires: callsigns are reassigned between schedule seasons,
 * so rows carry a TTL and are re-resolved once stale.
 */
@Entity({ name: 'flight_route' })
export class FlightRouteEntity {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  callsign!: string;

  @Column({ type: 'boolean', default: true })
  found!: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  callsignIcao!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  callsignIata!: string | null;

  @Column({ type: 'text', nullable: true })
  airlineName!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  airlineIcao!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  airlineIata!: string | null;

  @Column({ type: 'text', nullable: true })
  airlineCountry!: string | null;

  @Column({ type: 'text', nullable: true })
  airlineRadioCallsign!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  originIcao!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  midpointIcao!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  destinationIcao!: string | null;

  @Column({ type: 'bigint' })
  fetchedAt!: string;
}

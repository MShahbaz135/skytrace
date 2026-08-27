import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Airframe detail keyed by Mode-S address. Aircraft type does not change, so rows are
 * kept indefinitely; `found = false` records a confirmed miss to stop repeat lookups.
 */
@Entity({ name: 'aircraft' })
export class AircraftEntity {
  @PrimaryColumn({ type: 'varchar', length: 8 })
  icao24!: string;

  @Column({ type: 'boolean', default: true })
  found!: boolean;

  @Column({ type: 'text', nullable: true })
  registration!: string | null;

  @Column({ type: 'text', nullable: true })
  type!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  icaoType!: string | null;

  @Column({ type: 'text', nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'text', nullable: true })
  registeredOwner!: string | null;

  @Column({ type: 'text', nullable: true })
  ownerCountryName!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  ownerCountryIso!: string | null;

  @Column({ type: 'text', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  photoThumbnailUrl!: string | null;

  @Column({ type: 'bigint' })
  fetchedAt!: string;
}

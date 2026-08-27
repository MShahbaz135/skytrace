import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'airport' })
export class AirportEntity {
  @PrimaryColumn({ type: 'varchar', length: 8 })
  icao!: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  iata!: string | null;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  municipality!: string | null;

  @Column({ type: 'text', nullable: true })
  countryName!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  countryIso!: string | null;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ type: 'integer', nullable: true })
  elevation!: number | null;
}

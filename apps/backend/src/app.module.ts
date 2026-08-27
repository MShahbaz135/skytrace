import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { loadConfig } from './config/configuration';
import { TrackingModule } from './modules/tracking/tracking.module';

/**
 * Postgres only backs the enrichment cache, so the app stays bootable without it —
 * useful for local work on the live stream and for the replay demo mode.
 */
function databaseImports(): DynamicModule[] {
  const { database } = loadConfig();
  if (!database.enabled) return [];

  return [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: database.host,
      port: database.port,
      username: database.username,
      password: database.password,
      database: database.database,
      synchronize: true,
      autoLoadEntities: true,
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    ...databaseImports(),
    TrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

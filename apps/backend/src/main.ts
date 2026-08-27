// Must precede every other import: module files read configuration at import time to
// decide which providers to register, and that happens before Nest's ConfigModule runs.
import 'dotenv/config';

import { Logger, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { CONFIG_TOKEN, type AppConfig } from './config/configuration';

/** Applies the configured browser origins to the Socket.IO server as well as the REST API. */
class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[] | boolean,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origins, credentials: false },
    });
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(CONFIG_TOKEN);

  const origins = config.corsOrigins.includes('*') ? true : config.corsOrigins;
  app.enableCors({ origin: origins });
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, origins));
  app.enableShutdownHooks();

  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`SkyTrace API listening on port ${config.port}`);
  logger.log(
    config.openSky.clientId
      ? 'OpenSky credentials found, using the authenticated 4,000 credit/day tier'
      : 'No OpenSky credentials, falling back to anonymous access (400 credits/day)',
  );
  if (!config.database.enabled) {
    logger.warn('DB_HOST is unset, enrichment will cache in memory only');
  }
}

void bootstrap();

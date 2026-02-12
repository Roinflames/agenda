import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Prisma v5 removed the "beforeExit" hook from PrismaClient.$on, so we rely on process signals.
  enableShutdownHooks(app: INestApplication) {
    const shutdown = async () => {
      try {
        await app.close();
      } finally {
        await this.$disconnect();
      }
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}

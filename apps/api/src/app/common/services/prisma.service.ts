import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    super({ log: ['query', 'info', 'warn', 'error'] });
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}

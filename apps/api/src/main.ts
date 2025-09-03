import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: true,
    });

    const globalPrefix = 'api';

    app.enableCors({
      origin: ['http://localhost:4200', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Cache-Control',
        'X-Requested-With',
      ],
      credentials: true,
    });

    app.setGlobalPrefix(globalPrefix);

    app.getHttpServer().timeout = 0;
    app.getHttpServer().keepAliveTimeout = 0;
    app.getHttpServer().headersTimeout = 0;

    const port = process.env.PORT || 3000;
    await app.listen(port);

    Logger.log(
      `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
    );
    Logger.log('Server configured for Server-Sent Events');
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

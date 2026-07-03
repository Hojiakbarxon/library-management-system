import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalFilter } from './common/filters/global/global.filter';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { swaggerSetup } from './startup/swagger.setup';
import { validationConfig } from './startup/validation.pipe.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/api/uploads' });

  app.useGlobalFilters(new GlobalFilter())

  swaggerSetup(app);

  validationConfig(app);

  app.enableCors({ origin: true, credentials: true })

  await app.listen(envConfig.port, () =>
    console.log(`server is running on port `, envConfig.port),
  );
}

bootstrap();

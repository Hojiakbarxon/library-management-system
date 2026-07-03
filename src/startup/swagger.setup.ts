import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
export function swaggerSetup(app : NestExpressApplication) {
    const config = new DocumentBuilder()
        .setTitle('Library management system')
        .setDescription(`Library management system documentation`)
        .setVersion(`1.0`)
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`/docs`, app, document);
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { addSchemasToSwagger } from '@lonestone/nzoth/server';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setOpenAPIVersion("3.1.0")
    .setTitle('Lonestone API')
    .setDescription('The Lonestone API description')
    .setVersion('1.0')
    .addTag('@lonestone')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  addSchemasToSwagger(document);

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: '/docs-json',
    customSiteTitle: 'Lonestone API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.8/swagger-ui-bundle.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.8/swagger-ui.min.css',
    ],
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      persistAuthorization: true,
      displayOperationId: false,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      defaultModelRendering: 'model',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(3000);
}
bootstrap();

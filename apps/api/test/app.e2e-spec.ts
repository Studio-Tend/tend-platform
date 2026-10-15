import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { prepareE2eDatabase } from './e2e-database';

describe('App (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    prepareE2eDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health/live returns 200', async () => {
    await request(app!.getHttpServer()).get('/health/live').expect(200).expect({
      status: 'ok',
    });
  });

  it('GET /health/ready returns 200 when database is available', async () => {
    await request(app!.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({
        status: 'ok',
        checks: { database: 'ok' },
      });
  });
});

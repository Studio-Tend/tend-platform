import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

describe('AppModule', () => {
  const providers =
    (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as unknown[]) ??
    [];
  const imports =
    (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[]) ?? [];

  it('registers foundation providers without JWT or role guards', () => {
    expect(providers).toEqual(
      expect.arrayContaining([
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: APP_FILTER,
          useClass: ProblemDetailsFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useExisting: IdempotencyInterceptor,
        },
      ]),
    );

    expect(providers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: APP_GUARD,
          useExisting: expect.anything(),
        }),
      ]),
    );
  });

  it('does not import auth, users, or roles modules', () => {
    const importNames = imports.map((imported) => {
      if (typeof imported === 'function') {
        return imported.name;
      }

      return undefined;
    });

    expect(importNames).not.toEqual(
      expect.arrayContaining(['AuthModule', 'UsersModule', 'RolesModule']),
    );
    expect(importNames).toEqual(
      expect.arrayContaining(['HealthModule', 'IdempotencyModule']),
    );
  });
});

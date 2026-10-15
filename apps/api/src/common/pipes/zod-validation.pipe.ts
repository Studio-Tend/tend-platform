import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodType } from 'zod';

/**
 * Validates request payloads with Zod schemas (typically from `@tend/core`).
 *
 * Use per-parameter for bodies/queries:
 * `@Body(new ZodValidationPipe(NewGoalSchema))`
 *
 * Registered globally without a schema, the pipe is a no-op so health and
 * other untyped routes keep working until they opt in.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (!this.schema) {
      return value;
    }

    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    return parsed.data;
  }
}

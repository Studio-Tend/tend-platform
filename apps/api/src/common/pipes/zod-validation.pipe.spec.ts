import { BadRequestException } from '@nestjs/common';
import { NewGoalSchema } from '@tend/core';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const metadata = { type: 'body' as const, metatype: Object, data: '' };

  it('passes values through when no schema is configured', () => {
    const pipe = new ZodValidationPipe();
    const value = { anything: true };

    expect(pipe.transform(value, metadata)).toBe(value);
  });

  it('returns parsed data for a valid @tend/core schema', () => {
    const pipe = new ZodValidationPipe(NewGoalSchema);

    expect(
      pipe.transform(
        { title: 'Sleep enough', cadence: 'daily' },
        metadata,
      ),
    ).toEqual({ title: 'Sleep enough', cadence: 'daily' });
  });

  it('throws BadRequestException when validation fails', () => {
    const pipe = new ZodValidationPipe(NewGoalSchema);

    expect(() =>
      pipe.transform({ title: '', cadence: 'yearly' }, metadata),
    ).toThrow(BadRequestException);

    try {
      pipe.transform({ title: '', cadence: 'yearly' }, metadata);
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        issues: unknown[];
      };
      expect(response.message).toBe('Validation failed');
      expect(Array.isArray(response.issues)).toBe(true);
      expect(response.issues.length).toBeGreaterThan(0);
    }
  });
});

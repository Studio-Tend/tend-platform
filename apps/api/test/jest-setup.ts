process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/tend_test?schema=public';
process.env.THROTTLE_TTL ??= '60';
process.env.THROTTLE_LIMIT ??= '1000';
process.env.IDEMPOTENCY_TTL_SECONDS ??= '86400';
process.env.LOG_LEVEL ??= 'info';

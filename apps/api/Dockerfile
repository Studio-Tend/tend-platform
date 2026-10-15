# Build from the repository root:
#   docker build -f apps/api/Dockerfile .
FROM node:24.19.0-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY packages/core ./packages/core
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

RUN pnpm --filter @tend/core build
RUN pnpm --filter @tend/api prisma:generate
RUN pnpm --filter @tend/api build
RUN pnpm --filter @tend/api deploy --prod --legacy /out

# Production stage
FROM node:24.19.0-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder /out ./
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./
COPY --from=builder /app/apps/api/src/generated ./src/generated

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "\
const http=require('http');\
const req=http.get('http://127.0.0.1:3000/health/live', (r)=>process.exit(r.statusCode===200?0:1));\
req.on('error', ()=>process.exit(1));\
req.setTimeout(8000, ()=>{req.destroy(); process.exit(1);});\
"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
